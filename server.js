//JT709X VERSION 1.4 PROTOCOL
//ING. TOMAS BLANCO
//LOGISEGURIDAD LTDA
//FECHA: 13/11/2025
//VERSION: 1.0

require("dotenv").config();

const net = require("net");
const { procesarCadena } = require("./function");
const { responseServer } = require("./response");

// ✅ Event Hubs
const { EventHubProducerClient } = require("@azure/event-hubs");

// ====== ENV ======
const EVENTHUB_CONNECTION_STRING = process.env.EVENTHUB_CONNECTION_STRING;
const EVENTHUB_NAME = process.env.EVENTHUB_NAME;

if (!EVENTHUB_CONNECTION_STRING) throw new Error("Falta EVENTHUB_CONNECTION_STRING en .env");
if (!EVENTHUB_NAME) throw new Error("Falta EVENTHUB_NAME en .env");

// ✅ HOST/PORT (antes venían de dbpool.js)
const HOST = process.env.UDP_HOST || "127.0.0.1";
const PORT = Number(process.env.UDP_PORT || 9007);

// Variables.
const var1 = "7e0002";
const var2 = "283";
const var3 = "7e0200";

// ===== EventHub Producer (singleton) =====
let producer;

function getProducer() {
  if (!producer) {
    producer = new EventHubProducerClient(EVENTHUB_CONNECTION_STRING, EVENTHUB_NAME);
    console.log("✅ EventHubProducerClient listo");
  }
  return producer;
}

async function sendToEventHub(body, partitionKey) {
  const p = getProducer();
  const batch = await p.createBatch(partitionKey ? { partitionKey } : undefined);

  const ok = batch.tryAdd({ body });
  if (!ok) throw new Error("Evento demasiado grande para Event Hub");

  await p.sendBatch(batch);
}

// --- Helpers: normalizar flags a BIT(1) ---
const toBit = (v) => (v === 1 || v === "1" || v === true) ? 1 : 0;

//CREACION DE SOCKET
const server = net.createServer((client) => {
  client.setKeepAlive(true, 150000);

  client.on("data", async (data) => {
    try {
      const hexData = data.toString("hex");
      console.log("Cadena de entrada: " + hexData + "\n");

      //1. Respuesta del servidor al dispositivo
      if (hexData.startsWith(var3)) {
        const resp = responseServer(hexData);
        if (resp && resp.frameHex) client.write(resp.frameHex);
      }

      //2. Envio de datos al EventHub (en vez de DB)
      if (hexData.startsWith(var3)) {
        let size_hexData = hexData.length;
        let cadena = hexData;

        // Limpieza de escapes
        if (cadena.includes("7d01") && cadena.includes("7d02")) {
          cadena = cadena.replace(/7d01/g, "7d").replace(/7d02/g, "7e");
        } else if (cadena.includes("7d01")) {
          cadena = cadena.replace(/7d01/g, "7d");
        } else if (cadena.includes("7d02")) {
          cadena = cadena.replace(/7d02/g, "7e");
        } else if (cadena.includes("7d017d02")) {
          cadena = cadena.replace(/7d017d02/g, "7d7e");
        } else {
          cadena = hexData;
        }

        //Respuesta calculadora xor
        const resp = responseServer(hexData);
        const xorAns = resp?.xorEscaped;

        const resultado = procesarCadena(cadena);

        // Variables (igual que tu código)
        const typeDevice = "JT800";
        const id_device = resultado.id_device;
        const imei = resultado.imei;
        const protocol_version = resultado.proto_ver;

        const battery_status = resultado.battery_status;
        const aux_battery_power = resultado.batt_perc;
        const aux_battery_volt = resultado.batt_volt;

        const level_gsm_señal = resultado.gsm;
        const network = resultado.network_type;

        const gps_position = resultado.gps_valid;
        const n_satellites = resultado.sats;

        const latitud = resultado.latitud;
        const longitud = resultado.longitud;
        const speed_km = resultado.speed_km;
        const altitud = resultado.altitude;

        const date = resultado.date; // 'YYYY-MM-DD HH:mm:ss'
        const mileage = resultado.mileage;

        const cell_id = resultado.cell_id;
        const lac_id = resultado.lac;
        const mcc_base_station = resultado.mcc;
        const code_base_station = resultado.mnc;

        const x_axis = resultado.x;
        const y_axis = resultado.y;
        const z_axis = resultado.z;

        const code_event = resultado.code_event;
        const id_pass = resultado.id_pass;
        const id_rfid = resultado.id_rfid;

        const motor_status = resultado.motor_unlocked;
        const coverStatus = resultado.back_cover_open_close;
        const lock_status = resultado.rope_cut_status;

        const back_cover_alarm = resultado.back_cover_alarm;
        const vibration_alarm = resultado.vibration_alarm;
        const over_speed_alarm = resultado.over_speed_alarm;
        const beidou_used_position = resultado.beidou_used_position;
        const speed_alarm = resultado.speed_alarm;

        const fence_alarm_enter = resultado.fence_alarm_enter;
        const fence_alarm_exit = resultado.fence_alarm_exit;

        const bluetooth_conection = resultado.bluetooth_conection;
        const level_humi = resultado.lumenUni; // como lo tenías

        // Flags bit
        const p_lowBattAlarm = toBit(battery_status);
        const p_locationIndicator = toBit(gps_position);
        const p_lock_status = toBit(lock_status);
        const p_motor_status = toBit(motor_status);

        const p_coverAlarm = toBit(back_cover_alarm);
        const p_coverStatus = toBit(coverStatus);
        const p_vibrationAlarm = toBit(vibration_alarm);

        const p_btConnect = toBit(bluetooth_conection);
        const p_overSpeed = toBit(over_speed_alarm);
        const p_beidouPosition = toBit(beidou_used_position);
        const p_speedAlarm = toBit(speed_alarm);

        const p_enterFence = toBit(fence_alarm_enter);
        const p_exitFence = toBit(fence_alarm_exit);

        // ✅ Evento a publicar (en vez de INSERT)
        const eventBody = {
          typeDevice,
          deviceID: id_device,
          imei,
          protocolVersion: String(protocol_version),

          dateTime: date,                 // lo que venía en tu INSERT
          insertDateTime: new Date().toISOString(),

          bat: aux_battery_power,
          battery: aux_battery_volt,
          lowBattAlarm: p_lowBattAlarm,
          locationIndicator: p_locationIndicator,
          satquality: n_satellites,

          latitude: latitud,
          longitude: longitud,
          altitud,
          speed: Math.round(speed_km),
          mileage,

          lock_status: p_lock_status,
          motor_status: p_motor_status,
          code_event,
          idPass: id_pass,
          idRfid: id_rfid,

          coverAlarm: p_coverAlarm,
          coverStatus: p_coverStatus,
          vibrationAlarm: p_vibrationAlarm,
          gsmquality: level_gsm_señal,
          network,

          code_station: code_base_station,
          mcc: mcc_base_station,
          cellID: cell_id,
          lacID: lac_id,

          btConnect: p_btConnect,
          overSpeed: p_overSpeed,
          beiduoPosition: p_beidouPosition,
          speedAlarm: p_speedAlarm,
          enterGeoFenceAlarm: p_enterFence,
          exitGeoFenceAlarm: p_exitFence,

          level_lux: level_humi, // así lo usabas
          x_axis,
          y_axis,
          z_axis,

          rawData: hexData,
          sizeRawData: size_hexData,
          xorAns: xorAns,

          _receivedAtUtc: new Date().toISOString()
        };

        // ✅ Enviar al Event Hub (partitionKey para ordenar por device)
        await sendToEventHub(eventBody, String(id_device || ""));
        console.log("📤 Enviado a Event Hub OK\n");
      }
    } catch (err) {
      console.error("❌ Error procesando/enviando a EventHub:", err?.message || err);
    }
  });

  client.on("end", () => {
    console.log("Conexión terminada\n");
  });

  client.on("error", (err) => {
    console.error("Socket error:", err && err.message);
  });
});

server.listen(PORT, HOST, () => {
  console.log(`Servidor TCP escuchando en ${HOST}:${PORT}\n`);
});

server.on("error", (err) => {
  console.error("Server error:", err && err.message);
});

server.on("close", () => {
  console.log("Servidor cerrado");
});

// Cierre limpio
process.on("SIGINT", async () => {
  console.log("\n🛑 Cerrando...");
  try {
    server.close();
    if (producer) await producer.close();
  } catch {}
  process.exit(0);
});
