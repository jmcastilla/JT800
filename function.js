const crc = require('crc');
const { parse, format } = require('date-fns');

// Funciones de utilidad
function toSignedInt16(value) {
    return (value & 0x8000) ? value - 0x10000 : value;
}

function hexToBinary(hexString, bits = 32) {
    return parseInt(hexString, 16).toString(2).padStart(bits, '0');
}

function parse_ID_32_LockStatus(valorHex) {
    if (!valorHex || valorHex.length < 8) return {};
    const lockValue = parseInt(valorHex, 16);
    const binary = lockValue.toString(2).padStart(32, '0').split('').reverse();

    // Obtención del Lock Event ID (Bits 0-5)
    let lockEventID = 0;
    if ((lockValue & 0x01)) lockEventID = 1;      // Bluetooth
    else if ((lockValue & 0x02)) lockEventID = 2; // RFID
    else if ((lockValue & 0x04)) lockEventID = 3; // Password
    else if ((lockValue & 0x08)) lockEventID = 4; // Remote GPRS
    else if ((lockValue & 0x10)) lockEventID = 5; // SMS

    return {
        lock_event_id_32: lockEventID,
        motor_working:    binary[8] === '1',  // Bit 8
        motor_blocked:    binary[9] === '1',  // Bit 9
        rope_cut_status:  binary[11] === '1', // Bit 11
        case_open_status: binary[15] === '1', // Bit 15
        magnetic_sensor:  binary[20] === '1', // Bit 20
        low_battery_lock: binary[24] === '1'  // Bit 24
    };
}


function process_0B(valorHex) {
    const result = {
        code_event: '',
        id_rfid: '',
        id_pass: '',
        info:'',
        raw_content: valorHex
    };

    // 1. Extraer la longitud (Additional Information Length)
    const infoLength = valorHex.substr(0, 2).toUpperCase();

    // Asignar el valor directamente al objeto que se va a retornar
    result.code_event = infoLength;

    // 2. Extraer el contenido basado en la longitud

    let content = valorHex.substr(2, parseInt(infoLength, 16) * 2);

    // REGLA ESPECIAL: Si termina en '65', se omite ese byte
    if (content.endsWith('65')) {
        content = content.slice(0, -2);
    }

    // 3. Clasificación según el infoLength (Additional Command ID)
    switch (infoLength) {
        // Casos que se deben tratar como ASCII (Contraseñas/IDs de usuario)
        case "01": case "02": case "03": case "05": case "06":
        case "07": case "08": case "10": case "11": case "18":
        case "19": case "20": case "28": case "29": case "1F":
        case "1E":
            try {
                result.id_pass = Buffer.from(content, 'hex').toString('ascii').trim();
            } catch (e) {
                result.id_pass = content;
            }
            break;

        // Casos que se deben tratar como DECIMAL (Tarjetas RFID)
        case "22":
        case "23":
        case "2A":
        case "2B":
            try {
                // Convertir a Decimal usando BigInt para evitar pérdida de precisión
                result.id_rfid = BigInt("0x" + content).toString();
            } catch (e) {
                result.id_rfid = content;
            }
            break;

    }

    return result;
}

function field_Extended_information(aux_info) {
    const res = {
        gsm_signal: 0, satellites: 0, device_status_expansion: 0,
        battery_perc: 0, battery_volt: 0, external_sensor_data: '',
        gnss_module_status: '', camera: 0, hardware_version: '',
        imei_ascii: '', network_type: 0, lumenUni: 0,
        protocol_version: 0, x_axis: 0, y_axis: 0, z_axis: 0,
        bluetooth_status: 0, mcc: 0, mnc: 0, cell_id: 0, lac: 0,
        mileage: 0,
        // Variables ID 0x32
        lock_event_id_32: 0, is_motor_blocked: 0, is_rope_cut: 0, is_case_manipulated: 0,
        // Telemetría 33
        batt_soc: 0, batt_soh: 0, batt_current: 0, batt_temp: 0, batt_cycles: 0, batt_capacity: 0
        //0x0B
        ,id_rfid: '', id_pass: '', code_event: '', event_name: ''
    };

    let i = 0;
    while (i < aux_info.length - 4) {
        const id = aux_info.substr(i, 2).toLowerCase();
        const len = parseInt(aux_info.substr(i + 2, 2), 16);
        const valor = aux_info.substr(i + 4, len * 2);
        if (!id || isNaN(len)) break;

        switch (id) {
            case "30": res.gsm_signal = parseInt(valor, 16); break;
            case "31": res.satellites = parseInt(valor, 16); break;
            case "32":
                const lockDetails = parse_ID_32_LockStatus(valor);
                res.device_status_expansion = parseInt(valor, 16);
                res.lock_event_id_32 = lockDetails.lock_event_id_32;
                res.is_motor_blocked = lockDetails.motor_blocked ? 1 : 0;
                res.is_rope_cut = lockDetails.rope_cut_status ? 1 : 0;
                res.is_case_manipulated = lockDetails.case_open_status ? 1 : 0;
                break;
            case "33":
                if (valor.length >= 46) {
                    let curVal = parseInt(valor.substr(10, 8), 16);
                    res.batt_current = curVal > 0x7FFFFFFF ? curVal - 0x100000000 : curVal;
                    res.batt_temp = (parseInt(valor.substr(18, 4), 16) / 10) - 50;
                    res.batt_soc = parseInt(valor.substr(22, 2), 16);
                    res.batt_soh = parseInt(valor.substr(24, 2), 16);
                    res.batt_cycles = parseInt(valor.substr(26, 4), 16);
                    res.batt_capacity = parseInt(valor.substr(38, 8), 16);
                }
                break;
            case "d4": res.battery_perc = parseInt(valor, 16); break;
            case "d5": res.battery_volt = parseInt(valor, 16) * 0.01; break;
            case "d8": res.external_sensor_data = valor; break;
            case "e5": res.gnss_module_status = valor; break;
            case "e7": res.camera = parseInt(valor, 16); break;
            case "ef": res.hardware_version = Buffer.from(valor, 'hex').toString('ascii'); break;
            case "f2": res.imei_ascii = Buffer.from(valor, 'hex').toString('ascii'); break;
            case "f4": res.network_type = parseInt(valor, 16); break;
            case "f5":
                const valorLumen = parseInt(valor, 16);
                console.log("intensidad de luz: " + valorLumen);
                res.lumenUni = valorLumen; // ASIGNACIÓN CORRECTA
                break;
                break;
            case "f9": res.protocol_version = parseInt(valor, 16); break;
            case "fa":
                res.x_axis = toSignedInt16(parseInt(valor.substr(0, 4), 16));
                res.y_axis = toSignedInt16(parseInt(valor.substr(4, 4), 16));
                res.z_axis = toSignedInt16(parseInt(valor.substr(8, 4), 16));
                break;
            case "fc": res.bluetooth_status = parseInt(valor, 16); break;
            case "fd":
                res.mcc = parseInt(valor.substr(0, 4), 16);
                res.mnc = parseInt(valor.substr(4, 4), 16);
                res.cell_id = parseInt(valor.substr(8, 8), 16);
                res.lac = parseInt(valor.substr(16, 4), 16);
                break;
            case "fe": res.mileage = parseInt(valor, 16); break;
            case "0b":
                const stepResult = process_0B(valor);
                res.code_event = stepResult.code_event;
                res.id_rfid = stepResult.id_rfid;
                res.id_pass = stepResult.id_pass;
                break;
        }
        i += 4 + (len * 2);
    }
    return res;
}

function procesarCadena(cadena) {
    try {
        cadena = cadena.replace(/\s/g, '');
        const id_device = cadena.substring(10, 22);

        // --- 2.3.3 DEVICE STATUS BIT DEFINITION (32 BITS) ---
        const status_hex = cadena.substring(34, 42);
        //console.log(`Status alarm: ${status_hex}\n`);
        const st_val = parseInt(status_hex, 16);
        const st_bin = st_val.toString(2).padStart(32, '0').split('').reverse();
        //console.log(`Status alarm binary: ${st_bin}`);
        const device_status = {
            solar_charging_status: st_bin[0] === '1' ? 1 : 0,
            gps_valid: st_bin[1] === '1' ? 1 : 0,
            lat_hem: st_bin[2] === '1' ? -1 : 1,
            lon_hem: st_bin[3] === '1' ? -1 : 1,
            usb_status: st_bin[4] === '1' ? 1 : 0,
            base_station_position: st_bin[6] === '1' ? 1 : 0,
            is_moving: st_bin[12] === '1' ? 1 : 0,
            cover_back_open: st_bin[13] ==='1'? 1:0,
            camera_up_file: st_bin[14] ==='1' ? 1:0,
            conver_top_open: st_bin[15] ==='1'? 1:0,
            sim_card_cover_open:st_bin[16] ==='1'? 1:0,
            bat_life_status:st_bin[17] ==='1'? 1:0,
            gps_use_position_enable:st_bin[18] ==='1'? 1:0,
            BeiDou_use_position_enable:st_bin[19] ==='1'? 1:0,
            rope_is_cut: st_bin[20] === '1' ? 1 : 0,
            motor_is_unlocked: st_bin[21] === '1' ? 1 : 0,
            device_sleep: st_bin[31] === '1' ? 1 : 0
        };

        //console.log(`Motor stado: ${device_status.motor_is_unlocked}\nRope stado: ${device_status.rope_is_cut}\nSolar Chargin: ${device_status.solar_charging_status}\ngps_valid:${device_status.gps_valid}\nLat_hem: ${device_status.lat_hem}\nLong_hem: ${device_status.lon_hem}\n`);
        const speed_raw = cadena.substring(62, 66);
        const speed_km = parseInt(speed_raw, 16) / 10;
        const altitude_raw = cadena.substring(58, 62);
        const altitude = parseInt(altitude_raw, 16);
        const time_bcd = cadena.substring(70, 82);
        const ext = field_Extended_information(cadena.substring(82, cadena.length - 2));

        const dataFinal = {
            ok: true,
            id_device, //
            imei: ext.imei_ascii,//
            date: `20${time_bcd.substring(0,2)}-${time_bcd.substring(2,4)}-${time_bcd.substring(4,6)} ${time_bcd.substring(6,8)}:${time_bcd.substring(8,10)}:${time_bcd.substring(10,12)}`,
            latitud: (parseInt(cadena.substring(42, 50), 16) / 1000000) * device_status.lat_hem, //
            longitud: (parseInt(cadena.substring(50, 58), 16) / 1000000) * device_status.lon_hem,//
            speed_km: speed_km, //
            altitude: altitude, //
            // --- VARIABLES SECCION 2.3.3 ---
            acc: device_status.acc,
            gps_valid: device_status.gps_valid, //
            motor_unlocked: device_status.motor_is_unlocked, //
            rope_cut_status: device_status.rope_is_cut, //
            moving: device_status.is_moving,
            solar: device_status.solar_charging,

            // --- VARIABLES ADICIONALES (2.3.4, 2.3.5, 2.3.6) ---
            gsm: ext.gsm_signal, //
            sats: ext.satellites, //
            batt_perc: ext.battery_perc, //
            batt_volt: ext.battery_volt, //
            mileage: ext.mileage, //
            network_type: ext.network_type, //
            hw_ver: ext.hardware_version,
            proto_ver: ext.protocol_version, //
            lumenUni: ext.lumenUni ,//
            gnss_status: ext.gnss_module_status,

            // Eventos Cerradura
            code_event: ext.code_event, //
            id_rfid: ext.id_rfid , //
            id_pass: ext.id_pass , //
            lock_event_id_32: ext.lock_event_id_32,
            is_motor_blocked_32: ext.is_motor_blocked,
            is_rope_cut_32: ext.is_rope_cut,
            is_case_manipulated_32: ext.is_case_manipulated,

            // Telemetría Batería (ID 33)
            soc: ext.batt_soc,
            soh: ext.batt_soh,
            current: ext.batt_current,
            batt_temp: ext.batt_temp,
            batt_cycles: ext.batt_cycles,
            capacity: ext.batt_capacity,

            // LBS / GPRS
            mcc: ext.mcc, mnc: ext.mnc, cell_id: ext.cell_id, lac: ext.lac, //
            x: ext.x_axis, y: ext.y_axis, z: ext.z_axis //
        };

        return dataFinal;

    } catch (err) {
        console.error("Error:", err.message);
        return { ok: false };
    }
}

module.exports = { procesarCadena };
