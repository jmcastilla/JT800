
const crc = require('crc');

function responseServer(hexData) {
  try {
    // --- Validación/normalización de entrada ---
    if (typeof hexData !== 'string') throw new TypeError('hexData debe ser string');
    let inHex = hexData.replace(/\s+/g, '').toLowerCase();
    if (inHex.length % 2 !== 0) throw new Error('HEX con longitud impar');

    const cadenaHex = hexData;
          
                  // Convertir la cadena hexadecimal a un objeto Buffer
                  const buffer = Buffer.from(cadenaHex, 'hex');
          
                  // Almacenar los bytes individuales en un array
                  const bytesIndividuales = Array.from(buffer);
          
                  // Encontrar y reemplazar los valores
                  for (let i = 0; i < bytesIndividuales.length - 1; i++) {
                  if (bytesIndividuales[i] === 0x7d && (bytesIndividuales[i + 1] === 0x01 || bytesIndividuales[i + 1] === 0x02)) {
                      if (bytesIndividuales[i + 1] === 0x01) {
                      bytesIndividuales[i] = 0x7d;
                      } else if (bytesIndividuales[i + 1] === 0x02) {
                      bytesIndividuales[i] = 0x7e;
                      }
                      bytesIndividuales.splice(i + 1, 1);  // Eliminar el byte siguiente
                  }
                  }
          
                  // Convertir los bytes modificados de vuelta a cadena hexadecimal
                  const cadenaModificada = Buffer.from(bytesIndividuales).toString('hex');
          
                  // console.log("Cadena original: ", cadenaHex +'\n');
                  // console.log("Cadena modificada: ", cadenaModificada +'\n');
          
                  let id_end='7e';
                  let id=cadenaModificada.substring(10,22);
                  let sn=cadenaModificada.substring(22,26);
                  let body ='80010005'+id+'0001'+sn+'020000';
                  //console.log('id '+id+'\n');
                  //console.log('sn '+sn+'\n');
                  //console.log('body '+body+'\n');
          
                  // Divide la cadena en substrings de 2 caracteres cada uno
                  const substrings = [];
                  for (let i = 0; i < body.length; i += 2) {
                  substrings.push(body.slice(i, i + 2));
                  }
          
                  // Convierte los substrings en valores hexadecimales y almacénalos en un arreglo
                  const arregloBytes = substrings.map(substring => parseInt(substring, 16));
          
                  // Calcula el resultado XOR
                  let resultadoXOR = arregloBytes[0];
                  for (let i = 1; i < arregloBytes.length; i++) {
                  resultadoXOR ^= arregloBytes[i];
                  }
                  let xorEscaped=resultadoXOR.toString(16).padStart(2, '0');
                  
                  if (xorEscaped.includes('7d')) {
                      // Solo '7d01' está presente, reemplazar solo eso
                      xorEscaped = xorEscaped.replace(/7d/g, '7d01');
                      //console.log('Reemplazar 7d por 7d01');
              
                  }else if (xorEscaped.includes('7e')) {
                      // Solo '7d02' está presente, reemplazar solo eso
                      xorEscaped = xorEscaped.replace(/7e/g, '7d02');
                      //console.log('Reemplazar 7e por 7d02');
                  }else{
                      xorEscaped = xorEscaped;
                  }
                  const cadenaHex_1=body;
                  
                  // Convertir la cadena hexadecimal a un objeto Buffer
                  const buffer_1 = Buffer.from(cadenaHex_1, 'hex');
                  
                  // Almacenar los bytes individuales en un array
                  const bytesIndividuales_1 = Array.from(buffer_1);
                  
                  // Encontrar y reemplazar los valores
                  for (let i = 0; i < bytesIndividuales_1.length; i++) {
                      if (bytesIndividuales_1[i] === 0x7d) {
                          bytesIndividuales_1.splice(i + 1, 0, 0x01);  // Insertar 0x01 después de 0x7d
                      } else if (bytesIndividuales_1[i] === 0x7e) {
                          bytesIndividuales_1.splice(i, 1, 0x7d, 0x02);  // Reemplazar 0x7e con 0x7d 0x02
                      }
                  }
                  //console.log('Valor xor '+xor);
                  // Convertir los bytes modificados de vuelta a cadena hexadecimal
                  const cadenaModificada_1 = Buffer.from(bytesIndividuales_1).toString('hex');
                  let ans = (id_end+cadenaModificada_1+xorEscaped+id_end).toUpperCase();
                  //console.log("Cadena original xor: ", cadenaHex_1 +'\n');
                  //console.log("Cadena modificada xor: ", cadenaModificada_1) +'\n';
                  console.log("Enviando repuesta: "+ans +'\n');
                  
                  const frameHex = Buffer.from(ans, 'hex'); // convierte la cadena hex a byte.

    // Logs útiles (puedes comentar si no los quieres)
    // console.log('MSG ID RX:', msgId.toUpperCase());
    // console.log('XOR RAW  :', xorHex);
    //console.log('RESP HEX :', frame);

    return {
      frameHex,       // texto HEX de la respuesta
      xorEscaped      // XOR tal como se puso en la trama (puede ser '7D01', '7D02' o igual a xorHex)
    };
  } catch (err) {
    console.log('Error modulo de respuesta del servidor al dispositivo:', err?.message || err);
    return null;
  }
}

// Wrapper opcional si quieres mantener la firma que devuelve sólo Buffer:
function responseServerBuffer(hexData) {
  const r = responseServer(hexData);
  return r ? r.frame : null;
}

module.exports = {responseServer}; 