//JT709X VERSION 1.4 PROTOCOL
//ING. TOMAS BLANCO
//LOGISEGURIDAD LTDA
//FECHA: 13/11/2025
//VERSION: 1.0

const net = require('net');
const { procesarCadena } = require('./function');
const { responseServer } = require('./response');

//Configuracion y creacion de conexiones
var mysql=require('./dbpool');
const { Socket } = require('dgram');
const socket = require('./dbpool');
const HOST = socket.UDP_HOST;  // IP tomada de dbpool.js
const PORT = socket.UDP_PORT;  // Puerto tomado de dbpool.js

// Variables.
const var1 = "7e0002";
const var2 = "283";
const var3 = "7e0200";
 
//CREACION DE SOCKET
    const server = net.createServer((client)=>{
        client.setKeepAlive(true,150000);
        
        client.on('data',  async(data)=>{
        
        try{
            const hexData = data.toString('hex');
            console.log('Cadena de entrada: '+hexData +'\n');

            //1. Respuesta del servidor al dispositivo
            if(hexData.startsWith(var3)){
                //console.log('Recive: '+hexData +'\n');
                const resp = responseServer(hexData);
                if (resp && resp.frameHex) client.write(resp.frameHex);
            }
            //2. Envio de datos a la DB
            if(hexData.startsWith(var3)) {
                
                let size_hexData=hexData.length;
                let cadena=hexData;
                
                if (cadena.includes('7d01') && cadena.includes('7d02')) {
                    // Reemplazar '7d01' por '7d' y '7d02' por '7e'
                    cadena = cadena.replace(/7d01/g, '7d').replace(/7d02/g, '7e');
                    //console.log('Reemplazar 7d01 por 7d y 7d02 por 7e');

                } else if (cadena.includes('7d01')) {
                    // Solo '7d01' está presente, reemplazar solo eso
                    cadena = cadena.replace(/7d01/g, '7d');
                    //console.log('Reemplazar 7d01 por 7d');

                } else if (cadena.includes('7d02')) {
                    // Solo '7d02' está presente, reemplazar solo eso
                    cadena = cadena.replace(/7d02/g, '7e');
                    //console.log('Reemplazar 7d02 por 7e');

                }else if (cadena.includes('7d017d02')) {
                    cadena = cadena.replace(/7d017d02/g, '7d7e');
                    //console.log('Reemplazar 7d017d02 por 7d7e');
                }else{
                    cadena = hexData;
                    //console.log('Cadena clean');
                }
                //Respuesta calculadora xor
                const resp = responseServer(hexData);
                const xorAns = resp.xorEscaped;


                var resultado = procesarCadena(cadena);
                //console.log(cadena);
                //console.log(resultado);
                var typeDevice='JT800';
                var id_device = resultado.id_device; //
                var imei =resultado.imei; //
                var protocol_version=resultado.proto_ver; //
                var battery_status=resultado.battery_status;
                var aux_battery_power = resultado.batt_perc; //
                var aux_battery_volt = resultado.batt_volt; //
                var level_gsm_señal = resultado.gsm; //
                var network=resultado.network_type; //
                var gps_position=resultado.gps_valid; //
                var gps_used_position = resultado.gps_used_position;
                var n_satellites= resultado.sats; //
                var latitud= resultado.latitud; //
                var longitud = resultado.longitud; //
                var speed_km= resultado.speed_km; //
                var altitud = resultado.altitude; //
                var date = resultado.date; //
                var speed_alarm = resultado.speed_alarm;
                var lumen_low = resultado.lumen_low;
                var lumen_high = resultado.lumen_high;
                var level_lux = resultado.level_lux;
                var temperature_low= resultado.temperature_low;
                var temperature_high = resultado.temperature_high;
                var level_temp= resultado.level_temp;
                var humi_high= resultado.humi_high;
                var humi_low= resultado.humi_low;
                var level_humi= resultado.lumenUni;
                var air_low = resultado.air_low;
                var air_high = resultado.air_high;
                var level_air = resultado.level_air;
                var back_cover_alarm = resultado.back_cover_alarm;
                var fence_alarm_enter = resultado.fence_alarm_enter;
                var fence_alarm_exit = resultado.fence_alarm_exit;
                var vibration_alarm= resultado.vibration_alarm;
                var wake_up= resultado.wake_up;
                var door_state=resultado.door_state;
                var beidou_used_position= resultado.beidou_used_position;
                var over_speed_alarm= resultado.over_speed_alarm;
                var bluetooth_conection = resultado.bluetooth_conection;
                var ext_power = resultado.ext_power;
                var mcc_base_station = resultado.mcc; //
                var code_base_station = resultado.mnc; //
                var cell_id = resultado.cell_id; //
                var lac_id = resultado.lac; //
                var x_axis= resultado.x; //
                var y_axis= resultado.y; //
                var z_axis= resultado.z; //
                var code_event=resultado.code_event; //
                var id_pass=resultado.id_pass; //
                var id_rfid=resultado.id_rfid; //
                var motor_status=resultado.motor_unlocked; //
                var coverStatus=resultado.back_cover_open_close;
                var mileage=resultado.mileage; //
                var lock_status= resultado.rope_cut_status; //
                
                //Usar el pool de conexiones MySQL --------------------------------------------------------------------
                 
                            // --- Helpers: normalizar flags a BIT(1) ---
                            const toBit = v => (v === 1 || v === '1' || v === true) ? 1 : 0;

                            const p_lowBattAlarm      = toBit(battery_status);          // baja batería (bit de alarma)  
                            const p_locationIndicator = toBit(gps_position);
                            const p_lock_status       = toBit(lock_status);             // 
                            const p_motor_status      = toBit(motor_status);           // 
                            const p_coverAlarm        = toBit(back_cover_alarm);       //
                            const p_coverStatus       = toBit(coverStatus);            // 
                            const p_vibrationAlarm    = toBit(vibration_alarm);        //
                            const p_btConnect         = toBit(bluetooth_conection);    //  
                            const p_overSpeed         = toBit(over_speed_alarm);       //  
                            const p_beidouPosition    = toBit(beidou_used_position);   //  
                            const p_speedAlarm        = toBit(speed_alarm);            //  
                            const p_enterFence        = toBit(fence_alarm_enter);      //  
                            const p_exitFence         = toBit(fence_alarm_exit);       //  
                            const p_lumen_low         = toBit(lumen_low);              //  
                            const p_lumen_high        = toBit(lumen_high);             //  
                            const p_temp_low          = toBit(temperature_low);        //  
                            const p_temp_high         = toBit(temperature_high);       //  
                            const p_humi_low          = toBit(humi_low);               //  
                            const p_humi_high         = toBit(humi_high);              //  
                            const p_air_low           = toBit(air_low);                //  
                            const p_air_high          = toBit(air_high);               //  
                            const p_ext_power         = toBit(ext_power);              //  

                            // --- SQL parametrizado (columnas correctas; sin comillas en bits) ---
                            const sql = `
                            INSERT INTO mainData (
                            maindataID, typeDevice, deviceID, imei, protocolVersion,
                            dateTime, insertDateTime,
                            bat, battery, lowBattAlarm, locationIndicator, satquality,
                            latitude, longitude, altitud, speed, mileage,
                            lock_status, motor_status, code_event, idPass, idRfid,
                            coverAlarm, coverStatus, vibrationAlarm, gsmquality, network,
                            code_station, mcc, cellID, lacID, btConnect, overSpeed, beiduoPosition,
                            speedAlarm, enterGeoFenceAlarm, exitGeoFenceAlarm, level_lux,
                            x_axis, y_axis, z_axis,
                            rawData, sizeRawData, xorAns
                            ) VALUES (
                            NULL, ?, ?, ?, ?,
                            ?, CURRENT_TIMESTAMP,
                            ?, ?, ?, ?, ?,
                            ?, ?, ?, ?, ?,
                            ?, ?, ?, ?, ?,
                            ?, ?, ?, ?, ?,
                            ?, ?, ?, ?, ?, ?, ?,
                            ?, ?, ?, ?,
                            ?, ?, ?,
                            ?, ?, ?
                            )`;

                            // --- Orden de params EXACTO ---
                            const params = [
                            'JT800',                     // typeDevice
                            id_device,                    // deviceID
                            imei,                         // imei
                            String(protocol_version),     // protocolVersion (varchar(5))  
                            date,                         // dateTime 'YYYY-MM-DD HH:mm:ss'
                            aux_battery_power,            // bat (int %)
                            aux_battery_volt,             // battery (double V)
                            p_lowBattAlarm,               // lowBattAlarm (bit)
                            p_locationIndicator,          // locationIndicator (bit)
                            n_satellites,                 // satquality (int)
                            latitud,                      // latitude (decimal(11,8))
                            longitud,                     // longitude (decimal(11,8))
                            altitud,                      // altitud (int)
                            Math.round(speed_km),         // speed (int) — 
                            mileage,                      // mileage (int)
                            p_lock_status,                // lock_status (bit)
                            p_motor_status,               // motor_status (bit)
                            code_event,                   // code_event (varchar(5)) 
                            id_pass,                      // idPass (varchar(9))
                            id_rfid,                      // idRfid (varchar(45))
                            p_coverAlarm,                 // coverAlarm (bit)
                            p_coverStatus,                // coverStatus (bit)
                            p_vibrationAlarm,             // vibrationAlarm (bit)
                            level_gsm_señal,              // gsmquality (int)
                            network,                      // network (int)
                            code_base_station,            // code_station (int)
                            mcc_base_station,             // mcc (int)
                            cell_id,                      // cellID (int)
                            lac_id,                       // lacID (int)
                            p_btConnect,                  // btConnect (bit)
                            p_overSpeed,                  // overSpeed (bit)
                            p_beidouPosition,             // beiduoPosition (bit)
                            p_speedAlarm,                 // speedAlarm (bit)
                            p_enterFence,                 // enterGeoFenceAlarm (bit)
                            p_exitFence,                  // exitGeoFenceAlarm (bit)
                            level_humi,
                            x_axis,
                            y_axis,
                            z_axis,
                            hexData,                      // rawData (varchar(300))
                            size_hexData,                 // sizeRawData (int)
                            xorAns                           //Answer Xor
                            ];

                            
                            const result = await mysql(sql, params);              //
                            console.log("INSERT OK:", result && result.affectedRows);
                            console.log('Envio exitoso DB JT800 \n');

                    }
            }catch(err){
                console.error("Fallo INSERT:", err && (err.sqlMessage || err.message), "\nSQL:", err && err.sql);
            }
            

        });
        
        client.on('end',()=>{
            console.log('Conexión terminada\n');
        });

        client.on('error', (err) => {
        console.error('Socket error:', err && err.message);
        });

    });

    server.listen(PORT, HOST, () => {
        console.log(`Servidor TCP escuchando en ${HOST}:${PORT}\n`);
    });

    server.on('error', (err) => {
        console.error('Server error:', err && err.message);
    });

    // Manejar evento cuando el servidor está cerrado
    server.on('close', () => {
        console.log('Servidor cerrado');
    });
