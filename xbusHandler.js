//  Copyright (c) 2003-2020 Xsens Technologies B.V. or subsidiaries worldwide.
//  All rights reserved.
//  
//  Redistribution and use in source and binary forms, with or without modification,
//  are permitted provided that the following conditions are met:
//  
//  1.      Redistributions of source code must retain the above copyright notice,
//           this list of conditions, and the following disclaimer.
//  
//  2.      Redistributions in binary form must reproduce the above copyright notice,
//           this list of conditions, and the following disclaimer in the documentation
//           and/or other materials provided with the distribution.
//  
//  3.      Neither the names of the copyright holders nor the names of their contributors
//           may be used to endorse or promote products derived from this software without
//           specific prior written permission.
//  
//  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY
//  EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF
//  MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL
//  THE COPYRIGHT HOLDERS OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
//  SPECIAL, EXEMPLARY OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT 
//  OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION)
//  HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY OR
//  TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
//  SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.THE LAWS OF THE NETHERLANDS 
//  SHALL BE EXCLUSIVELY APPLICABLE AND ANY DISPUTES SHALL BE FINALLY SETTLED UNDER THE RULES 
//  OF ARBITRATION OF THE INTERNATIONAL CHAMBER OF COMMERCE IN THE HAGUE BY ONE OR MORE 
//  ARBITRATORS APPOINTED IN ACCORDANCE WITH SAID RULES.
//  

// =======================================================================================
// Packages
// =======================================================================================
require('./global');
var fs           = require('fs');
const SerialPort = require('serialport');
const os         = require('os');

// =======================================================================================
// Constants
// =======================================================================================

// ----------------------------------------------------------------------------
// -- Common --
// ----------------------------------------------------------------------------
const RECORDINGS_PATH          = "/data/";
const RECORDINGS_MAC_ROOT_PATH     =  "/Applications/Xsens_DOT_Data_Exporter.app/Contents/Resources";

const XBUS_HEADER_PREAMBLE     = 0xFA;
const XBUS_HEADER_BID          = 0xFF;
const XBUS_HEADER_MID          = 0x78;
const XBUS_HEADER_MID_RESPONSE = 0x79;
const XBUS_HEADER              = Buffer.from([XBUS_HEADER_PREAMBLE, XBUS_HEADER_BID, XBUS_HEADER_MID]);

const XBLE_MID_DATA_RECORDING  = 0x01;
const XBLE_MID_CONFIGURATION   = 0x03;

const XBLE_MID_INDEX           = 4;
const XBLE_LEN_INDEX           = 5;

const MAC_ADDRESS_LEN          = 0x06;

const TWO_POW_TWELVE           = Math.pow(2, 12);

// ----------------------------------------------------------------------------
// -- States --
// ----------------------------------------------------------------------------
const STATE_IDLE                = 0x01;
const STATE_REQUEST_MAC_ADDRESS = 0x02;
const STATE_REQUEST_TAG         = 0x03;
const STATE_REQUEST_FLASH_INFO  = 0x04;
const STATE_CLEAR_STORAGE       = 0x05;
const STATE_REQUEST_FILE_INFO   = 0x06;
const STATE_REQUEST_FILE_DATA   = 0x07;

// ----------------------------------------------------------------------------
// -- Recording message ids --
// ----------------------------------------------------------------------------
const RECORDING_ID_STORE_FLASH_INFO_DONE  = 0x33;
const RECORDING_ID_EXPORT_FLASH_INFO_DONE = 0x52;
const RECORDING_ID_EXPORT_FILE_INFO_DONE  = 0x62;
const RECORDING_ID_EXPORTING_FILE_DATA    = 0x71;
const RECORDING_ID_EXPORT_FILE_DATA_DONE  = 0x72;

// ----------------------------------------------------------------------------
// -- Clear storage --
// ----------------------------------------------------------------------------
const XBUS_DATA_LEN_CLEAR_STORAGE = 0x08;
const XBLE_DATA_LEN_CLEAR_STORAGE = 0x05;
const XBLE_MID_CLEAR_STORAGE      = 0x30;
const XBUS_HEADER_CLEAR_STORAGE   = Buffer.from([XBUS_DATA_LEN_CLEAR_STORAGE, XBLE_MID_DATA_RECORDING, XBLE_DATA_LEN_CLEAR_STORAGE, XBLE_MID_CLEAR_STORAGE]);
const XBUS_STORE_FLASH_INFO_DONE  = Buffer.from([XBUS_HEADER_PREAMBLE, XBUS_HEADER_BID, XBUS_HEADER_MID, 0x04, 0x01, 0x01, RECORDING_ID_STORE_FLASH_INFO_DONE, 0xcb, 0x85]);

// ----------------------------------------------------------------------------
// -- Request configuration MacAddress & Tag --
// ----------------------------------------------------------------------------
const XBUS_DATA_LEN_REQUEST_CONFIG     = 0x04;
const XBLE_DATA_LEN_REQUEST_CONFIG     = 0x01;
const XBLE_MID_REQUEST_MAC_ADDRESS     = 0x01;
const XBLE_MID_REQUEST_TAG             = 0x02;
const XBUS_REQUEST_MAC_ADDRESS         = Buffer.from([XBUS_HEADER_PREAMBLE, XBUS_HEADER_BID, XBUS_HEADER_MID, XBUS_DATA_LEN_REQUEST_CONFIG, XBLE_MID_CONFIGURATION, XBLE_DATA_LEN_REQUEST_CONFIG, XBLE_MID_REQUEST_MAC_ADDRESS, 0xFB, 0x85]);
const XBUS_REQUEST_TAG                 = Buffer.from([XBUS_HEADER_PREAMBLE, XBUS_HEADER_BID, XBUS_HEADER_MID, XBUS_DATA_LEN_REQUEST_CONFIG, XBLE_MID_CONFIGURATION, XBLE_DATA_LEN_REQUEST_CONFIG, XBLE_MID_REQUEST_TAG, 0xFA, 0x85]);

// ----------------------------------------------------------------------------
// -- Request flash info --
// ----------------------------------------------------------------------------
const XBUS_DATA_LEN_REQUEST_FLASH_INFO   = 0x04;
const XBLE_DATA_LEN_REQUEST_FLASH_INFO   = 0x01;
const XBLE_MID_REQUEST_FLASH_INFO        = 0x50;
const XBLE_CHECKSUM_REQUEST_FLASH_INFO   = 0xAE;
const XBUS_CHECKSUM_REQUEST_FLASH_INFO   = 0x85;
const XBUS_HEADER_REQUEST_FLASH_INFO     = Buffer.from([XBUS_DATA_LEN_REQUEST_FLASH_INFO, XBLE_MID_DATA_RECORDING, XBLE_DATA_LEN_REQUEST_FLASH_INFO, XBLE_MID_REQUEST_FLASH_INFO, XBLE_CHECKSUM_REQUEST_FLASH_INFO, XBUS_CHECKSUM_REQUEST_FLASH_INFO]);
const XBUS_REQUEST_FLASH_INFO_ACK        = Buffer.from([XBUS_HEADER_PREAMBLE, XBUS_HEADER_BID, XBUS_HEADER_MID_RESPONSE, 0x06, 0x01, 0x03, 0x01, 0x00, XBLE_MID_REQUEST_FLASH_INFO, 0xab, 0x82]);
const XBUS_END_EXPORT_FLASH_INFO_ACK     = Buffer.from([XBUS_HEADER_PREAMBLE, XBUS_HEADER_BID, XBUS_HEADER_MID, 0x04, 0x01, 0x01, RECORDING_ID_EXPORT_FLASH_INFO_DONE, 0xac, 0x85]);
const XBUS_FLASH_INFO_HEADER_SIZE        = 4;

const INDEX_FILE_SYSTEM_SPACE_SIZE       = 17;
const FIELD_WIDTH_FILE_SYSTEM_SPACE_SIZE = 4;

// ----------------------------------------------------------------------------
// -- Request recording file information --
// ----------------------------------------------------------------------------
const XBUS_DATA_LEN_REQUEST_FILE_INFO  = 0x05;
const XBLE_DATA_LEN_REQUEST_FILE_INFO  = 0x02;
const XBLE_MID_REQUEST_FILE_INFO       = 0x60;
const XBUS_HEADER_REQUEST_FILE_INFO    = Buffer.from([XBUS_DATA_LEN_REQUEST_FILE_INFO, XBLE_MID_DATA_RECORDING, XBLE_DATA_LEN_REQUEST_FILE_INFO, XBLE_MID_REQUEST_FILE_INFO]);
const XBUS_END_EXPORT_FILE_INFO_ACK    = Buffer.from([XBUS_HEADER_PREAMBLE, XBUS_HEADER_BID, XBUS_HEADER_MID, 0x04, 0x01, 0x01, RECORDING_ID_EXPORT_FILE_INFO_DONE, 0x9c, 0x85]);

// ----------------------------------------------------------------------------
// -- Request recording file data --
// ----------------------------------------------------------------------------
const XBUS_DATA_LEN_REQUEST_FILE_DATA  = 0x05;
const XBLE_DATA_LEN_REQUEST_FILE_DATA  = 0x02;
const XBLE_MID_REQUEST_FILE_DATA       = 0x70;
const XBUS_HEADER_REQUEST_FILE_DATA    = Buffer.from([XBUS_DATA_LEN_REQUEST_FILE_DATA, XBLE_MID_DATA_RECORDING, XBLE_DATA_LEN_REQUEST_FILE_DATA, XBLE_MID_REQUEST_FILE_DATA]);
const XBUS_LEN_REQUEST_FILE_DATA_ACK   = 12
const XBUS_END_REQUEST_FILE_DATA_ACK   = Buffer.from([XBUS_HEADER_PREAMBLE, XBUS_HEADER_BID, XBUS_HEADER_MID, 0x04, 0x01, 0x01, RECORDING_ID_EXPORT_FILE_DATA_DONE, 0x8c, 0x85]);

// ----------------------------------------------------------------------------
// -- Stop export file data --
// ----------------------------------------------------------------------------
const XBUS_DATA_LEN_STOP_REC_FILE_DATA = 0x04;
const XBLE_DATA_LEN_STOP_REC_FILE_DATA = 0x01;
const XBLE_MID_STOP_REC_FILE_DATA      = 0x73;
const XBUS_STOP_REC_FILE_DATA          = Buffer.from([XBUS_HEADER_PREAMBLE, XBUS_HEADER_BID, XBUS_HEADER_MID, XBUS_DATA_LEN_STOP_REC_FILE_DATA, XBLE_MID_DATA_RECORDING, XBLE_DATA_LEN_STOP_REC_FILE_DATA, XBLE_MID_STOP_REC_FILE_DATA, 0x8B, 0x85]);

// ----------------------------------------------------------------------------
// -- Select exported data (all) --
// ----------------------------------------------------------------------------
const RECORDING_DATA_ID_TIMESTAMP      = 0x00;
const RECORDING_DATA_ID_ORIENTATION    = 0x01;
const RECORDING_DATA_ID_IQ             = 0x02;
const RECORDING_DATA_ID_IV             = 0x03;
const RECORDING_DATA_ID_EULER_ANGLES   = 0x04;
const RECORDING_DATA_ID_DQ             = 0x05;
const RECORDING_DATA_ID_DV             = 0x06;
const RECORDING_DATA_ID_CALIBRATED_ACC = 0x07;
const RECORDING_DATA_ID_CALIBRATED_GYR = 0x08;
const RECORDING_DATA_ID_CALIBRATED_MAG = 0x09;
const RECORDING_DATA_ID_STATUS         = 0x0A;
const RECORDING_DATA_ID_CLIP_ACC       = 0x0B;
const RECORDING_DATA_ID_CLIP_GYR       = 0x0C;

const DATA_COUNT_LEN                   = 4;

const RECORDING_DATA_LEN_MAPPER = 
{
    0x00: 4,  // Timestamp
    0x01: 16, // Orientation Quaternion
    0x02: 9,  // iq
    0x03: 12, // iv
    0x04: 12, // Orientation Euler Angles
    0x05: 16, // dq
    0x06: 12, // dv
    0x07: 12, // Calibrated Acc
    0x08: 12, // Calibrated Gyr
    0x09: 6,  // Mag
    0x0A: 2,  // Status
    0x0B: 1,  // Clip Acc
    0x0C: 1   // Clip Gyr
};

const LOGGING_DATA_TITLE_PACKET_COUNTER = "PacketCounter,";

const LOGGING_DATA_TITLE_MAPPER = 
{
    0x00: "SampleTimeFine,",
    0x01: "Quat_W,Quat_X,Quat_Y,Quat_Z,",
    0x02: "iq_X,iq_Y,iq_Z,",
    0x03: "iv_X,iv_Y,iv_Z,",
    0x04: "Euler_X,Euler_Y,Euler_Z,",
    0x05: "dq_W,dq_X,dq_Y,dq_Z,",
    0x06: "dv[1],dv[2],dv[3],",
    0x07: "Acc_X,Acc_Y,Acc_Z,",
    0x08: "Gyr_X,Gyr_Y,Gyr_Z,",
    0x09: "Mag_X,Mag_Y,Mag_Z,",
    0x0A: "Status,",
    0x0B: "ClipCountAcc,",
    0x0C: "ClipCountGyr,"
};

const XBLE_MID_SELECT_EXPORTED_DATA    = 0x74;

const EACH_RECORDING_HEADER_SIZE       = 4096;
const EACH_RECORDING_DATA_SIZE         = 55 * 4096;

// ----------------------------------------------------------------------------
// -- Retransmission file data --
// ----------------------------------------------------------------------------
const XBUS_DATA_LEN_RETRANSMISSION_FILE_DATA = 0x08;
const XBLE_DATA_LEN_RETRANSMISSION_FILE_DATA = 0x05;
const XBLE_MID_RETRANSMISSION_FILE_DATA      = 0x75;
const XBUS_RETRANSMISSION_TIMEOUT            = 200;
const XBUS_RETRANSMISSION_TEST               = false;

// =======================================================================================
// XBus handler class
// =======================================================================================
class XBusHandler
{
    constructor( portString, sensorServer )
    {
        var component = this;
        this.xbusState = STATE_IDLE;

        this.tag = "Xsens DOT";
        this.address = "";

        this.sensorServer = sensorServer;
        this.portString = portString;

        this.fileCount = 0;
        this.requestFileInfoId = 1;
        this.fileList = [];

        this.selectedFileList = [];
        this.requestFileDataId = 1;
        this.fileDataTotalPacketCount = 0;
        this.fileDataTotalDataBytes = 0;

        this.csvFileStreams = [];

        // For retransmission file data
        this.expectedDataCount = 0;
        this.isRetry = 0;
        this.isRetryTimeout = 0;
        this.isDebugRetry = 0;

        this.port = new SerialPort(portString, {
            baudRate: 921600 
        });

        // Open errors will be emitted as an error event
        this.port.on('error', function(err) {
            console.log('Error: ', err.message);

            sensorServer.sendXbusEvent("clearSensorStorageError", {port:portString});
        });

        this.port.on('disconnect', function () {
            console.log('Sensor disconnected');
        });

        this.port.on('close', function () {
            console.log('Sensor closed');

            sensorServer.sendXbusEvent("sensorClosed", {port:portString, address: component.address});
        });

        // Switches the port into "flowing mode"
        this.port.on('data', function (data) {

            if (component.xbusState != STATE_REQUEST_FILE_DATA)
            {
                console.log(portString + ' Data:', data);
            }

            if (data != null)
            {
                switch (component.xbusState)
                {
                    case STATE_CLEAR_STORAGE:
                        if (data.compare(XBUS_STORE_FLASH_INFO_DONE) == 0)
                        {
                            component.xbusState = STATE_IDLE;
                            sensorServer.sendXbusEvent("clearSensorStorageDone", {port:portString});
                        }
                        break;

                    case STATE_REQUEST_MAC_ADDRESS:
                        if (data.length > XBLE_LEN_INDEX
                            && data.slice(0, XBUS_HEADER.length).compare(XBUS_HEADER) == 0
                            && data[XBLE_MID_INDEX] == XBLE_MID_CONFIGURATION
                            && data[XBLE_LEN_INDEX] == MAC_ADDRESS_LEN)
                        {
                            var address = data[XBLE_LEN_INDEX + 6].toString(16).padStart(2, '0').toUpperCase() + ":"
                                + data[XBLE_LEN_INDEX + 5].toString(16).padStart(2, '0').toUpperCase() + ":"
                                + data[XBLE_LEN_INDEX + 4].toString(16).padStart(2, '0').toUpperCase() + ":"
                                + data[XBLE_LEN_INDEX + 3].toString(16).padStart(2, '0').toUpperCase() + ":"
                                + data[XBLE_LEN_INDEX + 2].toString(16).padStart(2, '0').toUpperCase() + ":"
                                + data[XBLE_LEN_INDEX + 1].toString(16).padStart(2, '0').toUpperCase();

                            component.xbusState = STATE_IDLE;
                            component.address = address;
                            sensorServer.sendXbusEvent("getMacAddressDone", {port:portString, address: address});
                        }
                        break;

                    case STATE_REQUEST_TAG:
                        if (data.length > XBLE_LEN_INDEX
                            && data.slice(0, XBUS_HEADER.length).compare(XBUS_HEADER) == 0
                            && data[XBLE_MID_INDEX] == XBLE_MID_CONFIGURATION
                            && data[XBLE_LEN_INDEX] > 0)
                        {
                            var tagLength = data[XBLE_LEN_INDEX];
                            var tag = data.slice(XBLE_LEN_INDEX + 1, XBLE_LEN_INDEX + 1 + tagLength).toString();

                            component.xbusState = STATE_IDLE;
                            component.tag = tag;
                            sensorServer.sendXbusEvent("getSensorTagDone", {port:portString, tag: tag});
                        }
                        break;

                    case STATE_REQUEST_FLASH_INFO:
                        if (component.flashInfoBuffer == null || component.flashInfoBuffer == undefined)
                        {
                            component.flashInfoBuffer = Buffer.from(data);
                        }
                        else
                        {
                            component.flashInfoBuffer = Buffer.concat([component.flashInfoBuffer, data]);
                        }
    
                        var len = component.flashInfoBuffer.length;
    
                        if (len > XBUS_REQUEST_FLASH_INFO_ACK.length 
                            && component.flashInfoBuffer.slice(len - XBUS_END_EXPORT_FLASH_INFO_ACK.length, len).compare(XBUS_END_EXPORT_FLASH_INFO_ACK) == 0)
                        {
                            component.xbusState = STATE_IDLE;
                            sensorServer.sendXbusEvent("exportFlashInfoDone", {port:portString});
                        }
                        break;

                    case STATE_REQUEST_FILE_INFO:
                        if (component.fileInfoBuffer == null || component.fileInfoBuffer == undefined)
                        {
                            component.fileInfoBuffer = Buffer.from(data);
                        }
                        else
                        {
                            component.fileInfoBuffer = Buffer.concat([component.fileInfoBuffer, data]);
                        }
    
                        var len = component.fileInfoBuffer.length;
    
                        if (len > XBUS_END_EXPORT_FILE_INFO_ACK.length 
                            && component.fileInfoBuffer.slice(len - XBUS_END_EXPORT_FILE_INFO_ACK.length, len).compare(XBUS_END_EXPORT_FILE_INFO_ACK) == 0)
                        {
                            var timestamp = (component.fileInfoBuffer[29] & 0xFF) | 
                                (component.fileInfoBuffer[30] & 0xFF) << 8 | 
                                (component.fileInfoBuffer[31] & 0xFF) << 16 |
                                (component.fileInfoBuffer[32] & 0xFF) << 24;
    
                            var fileName = getFileNameString(timestamp * 1000);
    
                            console.log("Get file info: timestamp " + timestamp + ", fileName " + fileName);

                            console.log("Get file info: fileList " + component.fileList);

                            component.fileList[component.requestFileInfoId - 1].index = component.requestFileInfoId;
                            component.fileList[component.requestFileInfoId - 1].fileName = fileName;

                            console.log("fileList: " + component.fileList);

                            component.fileList.forEach(function (item) {
                                console.log("fileItem: index " + item.index + ", fileName " + item.fileName + ", size " + item.size);
                            });

                            component.requestFileInfoId++;

                            if (component.requestFileInfoId > component.fileCount)
                            {
                                sensorServer.sendXbusEvent("exportFileInfoDone", {port:portString, fileList: component.fileList});

                                component.xbusState = STATE_IDLE;
                            }
                            else 
                            {
                                console.log("Get next file info, id " + component.requestFileInfoId);
                                component.fileInfoBuffer = null;

                                component.requestFileInfo();
                            }
                        }
                        break;
                    
                    case STATE_REQUEST_FILE_DATA:
                        if (component.fileDataBuffer == null || component.fileDataBuffer == undefined)
                        {
                            component.fileDataBuffer = Buffer.from(data);
                        }
                        else
                        {
                            component.fileDataBuffer = Buffer.concat([component.fileDataBuffer, data]);
                        }
    
                        var len = component.fileDataBuffer.length;
    
                        component.parseFileData();

                        break;
                }
            }
        });

        console.log( portString + " XBus Handler started." );
    }

    clearSensorStorage()
    {
        if (this.xbusState != STATE_IDLE) return;

        this.xbusState = STATE_CLEAR_STORAGE;

        var timeInMs = Date.now();
        var msBytes = new Uint32Array([Math.floor(timeInMs / 1000)]).buffer;
    
        var xbleData = Buffer.concat([XBUS_HEADER_CLEAR_STORAGE, Buffer.from(msBytes)]);
        var xbleCheckSumBuffer = checkSum(xbleData);
        xbleData = Buffer.concat([xbleData, xbleCheckSumBuffer]);

        var requestData = Buffer.concat([XBUS_HEADER, xbleData]);

        var checkSumBuffer = checkSum(requestData);
        requestData = Buffer.concat([requestData, checkSumBuffer]);

        console.log('[XBusHandler] clearSensorStorage milliseconds: ' + timeInMs + ", " + Buffer.from(msBytes).toString('hex') + ", request data hex " + requestData.toString('hex'));

        this.port.write(requestData, function(err) 
        {
          if (err) 
          {
            return console.log('Error on write: ', err.message);
          }
    
          console.log('[clearSensorStorage] message written hex ' + requestData.toString('hex'));
        });
    }

    requestMacAddress()
    {
        if (this.xbusState != STATE_IDLE) return;

        this.xbusState = STATE_REQUEST_MAC_ADDRESS;

        this.port.write(XBUS_REQUEST_MAC_ADDRESS, function(err) 
        {
            if (err) 
            {
              return console.log('Error on write: ', err.message);
            }
        
            console.log('[requestFlashInfo] message written hex ' + XBUS_REQUEST_MAC_ADDRESS.toString('hex'));
        });
    }

    requestSensorTag()
    {
        if (this.xbusState != STATE_IDLE) return;

        this.xbusState = STATE_REQUEST_TAG;

        this.port.write(XBUS_REQUEST_TAG, function(err) 
        {
            if (err) 
            {
              return console.log('Error on write: ', err.message);
            }
        
            console.log('[requestFlashInfo] message written hex ' + XBUS_REQUEST_TAG.toString('hex'));
        });
    }

    requestFlashInfo()
    {
        if (this.xbusState != STATE_IDLE) return;

        this.flashInfoBuffer = null;
        this.xbusState = STATE_REQUEST_FLASH_INFO;
        var requestData = Buffer.concat([XBUS_HEADER, XBUS_HEADER_REQUEST_FLASH_INFO]);

        this.port.write(requestData, function(err) 
        {
            if (err) 
            {
              return console.log('Error on write: ', err.message);
            }
        
            console.log('[requestFlashInfo] message written hex ' + requestData.toString('hex'));
        });
    }

    parseFlashInfo()
    {
        // COM4 Data: <Buffer>
        // fa ff 79 06 01 03 01 00 50 ab 82 // request flash info ack
        // fa ff 78 84 // xbus header
        // 01815173616c46800000000001eb41981200a0ff00ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff1f05
        // 018151eecccceeccccffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff9b05

        console.log ("[parseFlashInfo] total bytes " + this.flashInfoBuffer.length);

        var data = this.flashInfoBuffer;

        var buffers = [];
        var packetCount = 0;
        var startIndex = 0;
        var currentDataLen = 0;

        buffers[packetCount] = data.slice(startIndex, XBUS_REQUEST_FLASH_INFO_ACK.length);
        startIndex += XBUS_REQUEST_FLASH_INFO_ACK.length;

        if (DEBUG)
        {
            console.log ("buffer[" + packetCount + "]: " + buffers[packetCount].toString('hex'));
        }

        packetCount++;

        while (data.length > (startIndex + 5)
            && data[startIndex] == XBUS_HEADER_PREAMBLE 
            && data[startIndex + 1] == XBUS_HEADER_BID 
            && data[startIndex + 2] == XBUS_HEADER_MID 
            && data[startIndex + 3] == 0x84 
            && data[startIndex + 4] == 0x01)
        {
            currentDataLen = data[startIndex + 5];

            if (currentDataLen == 0) break;

            // xbusHeader(4) + xbleHeader(2) + dataLength + checksum(1)
            var itemLen = XBUS_FLASH_INFO_HEADER_SIZE + 2 + currentDataLen + 1;

            buffers[packetCount] = data.slice(startIndex, startIndex + itemLen + 1);

            if (DEBUG)
                console.log ("buffer[" + packetCount + "]: len " + currentDataLen + ", " + buffers[packetCount].toString('hex'));

            startIndex += itemLen + 1;
            packetCount++;

            if (DEBUG)
                console.log ("buffer[" + packetCount + "]: next startIndex " + startIndex + ", data["+ startIndex +"] " + data[startIndex]);

        }

        this.flashInfoBuffer = buffers;

        var storageSpace = -1;

        // Get total storage
        if (this.flashInfoBuffer.length > 2)
        {
            var fileSystemHeader = this.flashInfoBuffer[1];

            if (fileSystemHeader.length >= XBUS_FLASH_INFO_HEADER_SIZE + INDEX_FILE_SYSTEM_SPACE_SIZE + FIELD_WIDTH_FILE_SYSTEM_SPACE_SIZE)
            {
                storageSpace = fileSystemHeader.readInt32LE(XBUS_FLASH_INFO_HEADER_SIZE + INDEX_FILE_SYSTEM_SPACE_SIZE);

                console.log("storageSpace " + storageSpace);
            }
        }

        // Get avaiable space
        var bufferSize = this.flashInfoBuffer.length;
        var avaiableStorageSpace = -1;
        var usedStorageSpace = 0;
        var fileCount = 0;
        var i;
        this.fileList = [];

        for ( i = 2; i < bufferSize; i++ )
        {
            var item = this.flashInfoBuffer[i];
            var startIndex = XBUS_FLASH_INFO_HEADER_SIZE + 3;

            while (item[startIndex] == 0xEE || item[startIndex] == 0xCC)
            {
                if (item[startIndex] == 0xEE)
                {
                    fileCount++;
                    usedStorageSpace += EACH_RECORDING_HEADER_SIZE;

                    this.addRecordingFile();
                }
                else
                {
                    usedStorageSpace += EACH_RECORDING_DATA_SIZE;
                    this.updateRecordingFile();
                }

                startIndex++;
            }
        }

        console.log("Add file size to fileList " + this.fileList);

        avaiableStorageSpace = storageSpace - usedStorageSpace;

        console.log("usedStorageSpace " + usedStorageSpace + ", avaiableStorageSpace " + avaiableStorageSpace + ", fileCount " + fileCount);

        this.flashInfoBuffer = null;
        this.fileCount = fileCount;
        this.requestFileInfoId = 1;

        this.sensorServer.sendXbusEvent("updateFlashInfo", 
            {port: this.portString, storageSpace: storageSpace, avaiableStorageSpace: avaiableStorageSpace, fileCount: fileCount});

    }

    addRecordingFile() {
        this.fileList.push({index: 0, fileName: "", size: 0});
    }

    updateRecordingFile() {
        var length = this.fileList.length;

        if (length > 0) {
            var info = this.fileList[length - 1];
            info.size += EACH_RECORDING_DATA_SIZE;
        }
    }

    requestFileInfo()
    {
        if (this.xbusState == STATE_IDLE)
        {
            this.requestFileInfoId = 1;
            this.fileInfoBuffer = null;
        }

        if ((this.xbusState != STATE_IDLE && this.requestFileInfoId == 1) 
            || this.fileCount == 0 || this.requestFileInfoId > this.fileCount) 
        {
            if (this.fileCount == 0) {
                this.sensorServer.sendXbusEvent("exportFileInfoDone", {port: this.portString, fileList: []});
            }
            return;
        }


        this.xbusState = STATE_REQUEST_FILE_INFO;
        
        var xbleData = Buffer.concat([XBUS_HEADER_REQUEST_FILE_INFO, Buffer.from([this.requestFileInfoId])]);
        var xbleCheckSumBuffer = checkSum(xbleData);
        xbleData = Buffer.concat([xbleData, xbleCheckSumBuffer]);
    
        var requestData = Buffer.concat([XBUS_HEADER, xbleData]);
    
        var checkSumBuffer = checkSum(requestData);
        requestData = Buffer.concat([requestData, checkSumBuffer]);

        this.port.write(requestData, function(err) 
        {
            if (err) 
            {
              return console.log('Error on write: ', err.message);
            }

            console.log('[requestFileInfo] message written hex ' + requestData.toString('hex'));
        });
    }
    
    requestFileData(selectedFileList, dateNow)
    {
        console.log('[requestFileData] port ' + this.portString);

        if (this.xbusState == STATE_IDLE)
        {
            this.requestFileDataId = 1;
            this.fileDataTotalDataBytes = 0;
            this.selectedFileList = selectedFileList;
            this.exportedDir = getFileNameString(dateNow) + "/";
            this.csvFileStreams = [];
        }

        if ((this.xbusState != STATE_IDLE && this.requestFileDataId == 1) 
            || this.selectedFileList == undefined || this.requestFileDataId > this.selectedFileList.length) 
        {
            if (this.selectedFileList != undefined && this.requestFileDataId > this.selectedFileList.length)
            {
                this.xbusState = STATE_IDLE;
            }
            return;
        }

        this.fileDataBuffer = null;
        this.resetDataExportingVars();

        this.xbusState = STATE_REQUEST_FILE_DATA;
        
        var xbleData = Buffer.concat([XBUS_HEADER_REQUEST_FILE_DATA, Buffer.from([this.selectedFileList[this.requestFileDataId - 1].index])]);
        var xbleCheckSumBuffer = checkSum(xbleData);
        xbleData = Buffer.concat([xbleData, xbleCheckSumBuffer]);
    
        var requestData = Buffer.concat([XBUS_HEADER, xbleData]);
    
        var checkSumBuffer = checkSum(requestData);
        requestData = Buffer.concat([requestData, checkSumBuffer]);

        this.startRecordingToFile(requestData);
    }
    
    parseFileData()
    {
        // COM4 Data: <Buffer>
        // fa ff 79 07 01 04 01 00 70 01 89 81 // request file data ack
        // fa ff 78 7b // xbus header
        // 01786101000000266c8b2d43cf313c07ac40bf288928bf55d79b3b7c000030ffffc108003601000044fcffff8c57ffff81b432c3202fd1be05b3a4420000803f00f29e37001840b7803d8e380040913a00f168bb0cd423be4e2b883dd2605abe029619c11d02153b9415b4bafa58053c2226defc221b00020000350e
        // 0178610200000041ad8b2d52b5303cd4ae40bf0c8628bf207a9a3bc40000e6feffdd0a007b0100004ffbffff992effffc9b632c35062d0be4cafa4420000803f00f40f37001014b780fe863800ae883a005975bb04cc23be7822803d430266be7b8e19c10ff4863a4ace8abae51bfd3b1026f8fc181b00020000e30e

        if (XBUS_RETRANSMISSION_TEST)
        {
            var startDt = new Date();
        }

        if (DEBUG)
        {
            console.log ("[parseFileData] total bytes " + this.fileDataBuffer.length);
        }

        var data = this.fileDataBuffer;

        var buffers = [];
        var packetCount = 0;
        var byteCount = 0;
        var startIndex = 0;
        var currentDataLen = 0;

        if (data[startIndex] == XBUS_HEADER_PREAMBLE 
            && data[startIndex + 1] == XBUS_HEADER_BID 
            && data[startIndex + 2] == XBUS_HEADER_MID_RESPONSE
            && data[startIndex + 3] == 0x07
            && data[startIndex + 4] == XBLE_MID_DATA_RECORDING )
        {
            buffers[packetCount] = data.slice(startIndex, XBUS_LEN_REQUEST_FILE_DATA_ACK);
            startIndex += XBUS_LEN_REQUEST_FILE_DATA_ACK;
    
            if (DEBUG)
            {
                console.log ("buffer[" + packetCount + "]: " + buffers[packetCount].toString('hex'));
            }
    
            packetCount++;
        }

        var isOneFileDone = false;

        while (data.length >= startIndex + XBUS_END_REQUEST_FILE_DATA_ACK.length)
        {
            if (data[startIndex] == XBUS_HEADER_PREAMBLE 
                && data[startIndex + 1] == XBUS_HEADER_BID 
                && data[startIndex + 2] == XBUS_HEADER_MID 
                && data[startIndex + 4] == XBLE_MID_DATA_RECORDING
                && data[startIndex + 6] == RECORDING_ID_EXPORTING_FILE_DATA)
            {
                currentDataLen = data[startIndex + 5];

                if (currentDataLen == 0) break;
    
                // xbusHeader(4) + xbleHeader(2) + dataLength + checksum(1)
                var itemLen = 4 + 2 + currentDataLen + 1;
    
                if ((startIndex + itemLen + 1) > data.length) break;
    
                buffers[packetCount] = data.slice(startIndex, startIndex + itemLen + 1);
    
                var startOffset = 7; // skip header
                var dataCount = getDataCount(buffers[packetCount], startOffset);

                if (DEBUG)
                {
                    console.log ("buffer[" + packetCount + "]: len " + currentDataLen + ", " + buffers[packetCount].toString('hex'));
                }
    
                if (XBUS_RETRANSMISSION_TEST)
                {
                    console.log (this.expectedDataCount + "vs" + dataCount);
                }

                if (this.expectedDataCount < dataCount)
                {
                    if (!this.isRetry)
                    {
                        this.retransmissionFileData(this.expectedDataCount);
                        this.isRetryTimeout = XBUS_RETRANSMISSION_TIMEOUT;
                        this.isRetry = true;
                        this.fileDataBuffer = Buffer.from('');
                        return;
                    }
                    else
                    {
                        this.isRetryTimeout--;
                        if (this.isRetryTimeout <= 0)
                        {
                            this.expectedDataCount = dataCount;
                        }
                    }
                }

                startIndex += itemLen + 1;

                if (XBUS_RETRANSMISSION_TEST)
                {
                    if ((this.expectedDataCount == 20) && (!this.isDebugRetry))
                    {
                        this.isDebugRetry = true;
                        console.log ("Will retransmission 20");
                        dataCount = 0xffffffff;
                    }
                }

                if  (this.expectedDataCount == dataCount)
                {
                    this.isRetryTimeout = 0;
                    this.isRetry = false;
                    this.parseSelectedRecordingData(buffers[packetCount]);
                    packetCount++;
                    this.expectedDataCount++;

                    byteCount += currentDataLen - 1 - 4; // -1 remove BLE MID, -4 remove data count
                }
    
                if (DEBUG)
                {
                    console.log ("buffer[" + packetCount + "]: next startIndex " + startIndex + ", data["+ startIndex +"] " + data[startIndex]);
                }
            }
            else
            {
                if ((data.length - startIndex) > XBUS_END_REQUEST_FILE_DATA_ACK.length) 
                {
                    startIndex++;
    
                    console.log ("[parseFileData] find file data " + startIndex);
                }
                else if (data.slice(startIndex, startIndex + XBUS_END_REQUEST_FILE_DATA_ACK.length).compare(XBUS_END_REQUEST_FILE_DATA_ACK) == 0)
                {
                    isOneFileDone = true;

                    this.csvFileStreams[this.requestFileDataId].end();

                    const fileIndex = this.selectedFileList[this.requestFileDataId - 1].index;
                    this.requestFileDataId++;
        
                    var isAllDone = false;
                    if (this.requestFileDataId > this.selectedFileList.length)
                    {
                        this.xbusState = STATE_IDLE;
                        isAllDone = true;
                    }
        
                    console.log ("[parseFileData] data export done,file index " + fileIndex + ", parsed total data items " + this.fileDataTotalPacketCount);
        
                    this.fileDataTotalPacketCount = 0;
                    this.resetDataExportingVars();

                    this.sensorServer.sendXbusEvent("exportFileDataDone", {port: this.portString, fileIndex: fileIndex, isAllDone: isAllDone});

                    break;
                }
                else 
                {
                    break;
                }
            }
        }

        if (!isOneFileDone)
        {
            this.fileDataTotalPacketCount += packetCount;
            this.fileDataTotalDataBytes += byteCount;

            if (DEBUG)
            {
                console.log ("[parseFileData] end index " + startIndex);
            }
    
            this.fileDataBuffer = this.fileDataBuffer.slice(startIndex, this.fileDataBuffer.length);
    
            var afterSlicedLen = this.fileDataBuffer.length;
        
            if (DEBUG)
            {
                console.log ("[parseFileData] buffer after slice " + this.fileDataBuffer.toString('hex'));
                console.log ("[parseFileData] buffer after slice " + afterSlicedLen + ", parsed total data items " + this.fileDataTotalPacketCount);
            }
        
            this.sensorServer.sendXbusEvent("exportedFileDataBytes", {port: this.portString, totalDataBytes: this.fileDataTotalDataBytes});
        }

        if (XBUS_RETRANSMISSION_TEST)
        {
            var endDt = new Date();
            console.log ("execution time: " + (endDt.getMilliseconds() - startDt.getMilliseconds()) + " ms");
        }
    }

    stopExportingFileData()
    {
        var component = this;

        if (this.xbusState != STATE_REQUEST_FILE_DATA)
        {
            return;
        }

        this.port.write(XBUS_STOP_REC_FILE_DATA, function(err) 
        {
            if (err) 
            {
              return console.log('Error on write: ', err.message);
            }

            console.log('[stopExportingFileData] ' + component.portString + ' message written hex ' + XBUS_STOP_REC_FILE_DATA.toString('hex'));

            component.xbusState = STATE_IDLE;
        });
    }

    selectExportedData(selectExportedDataIds)
    {
        console.log(this.portString + " selectExportedDataIds " + selectExportedDataIds);

        if (selectExportedDataIds == null || selectExportedDataIds == undefined || selectExportedDataIds.length == 0)
        {
            // default
            this.selectExportedDataIds = [
                RECORDING_DATA_ID_TIMESTAMP, 
                RECORDING_DATA_ID_EULER_ANGLES, 
                RECORDING_DATA_ID_CALIBRATED_ACC, 
                RECORDING_DATA_ID_CALIBRATED_GYR
            ];
        }
        else
        {
            this.selectExportedDataIds = selectExportedDataIds;
        }

        var xbleDataLen = this.selectExportedDataIds.length + 1; // 1: CHECKSUM
        var xbusLen = xbleDataLen + 3; // 3: XBUS_MID + BLE_MID + DATA_LEN

        var xbleData = Buffer.from([xbusLen, XBLE_MID_DATA_RECORDING, xbleDataLen, XBLE_MID_SELECT_EXPORTED_DATA]);

        var i = 0;
        while (i < this.selectExportedDataIds.length)
        {
            xbleData = Buffer.concat([xbleData, Buffer.from([this.selectExportedDataIds[i]])]);
            i++;
        }

        var xbleCheckSumBuffer = checkSum(xbleData);
        xbleData = Buffer.concat([xbleData, xbleCheckSumBuffer]);

        var requestData = Buffer.concat([XBUS_HEADER, xbleData]);

        var checkSumBuffer = checkSum(requestData);
        requestData = Buffer.concat([requestData, checkSumBuffer]);

        console.log('[XBusHandler] selectExportedData, request data hex ' + requestData.toString('hex'));

        this.port.write(requestData, function(err) 
        {
            if (err) 
            {
              return console.log('Error on write: ', err.message);
            }
    
            console.log('[selectExportedData] message written hex ' + requestData.toString('hex'));
        });
    }

    parseSelectedRecordingData(data)
    {
        if (this.selectExportedDataIds == null || this.selectExportedDataIds == undefined) return;

        var startOffset = 7; // skip header

        if (startOffset > data.length) return;

        var dataCount = getDataCount(data, startOffset);
        var timestamp = getRecordingData(data, RECORDING_DATA_ID_TIMESTAMP, startOffset + DATA_COUNT_LEN);
        startOffset += DATA_COUNT_LEN; // skip data count
        
        if (startOffset > data.length) return;

        var values = [];
        var i = 0;
        while (i < this.selectExportedDataIds.length)
        {
            var dataId = this.selectExportedDataIds[i];
            values.push(getRecordingData(data, dataId, startOffset));
            startOffset += RECORDING_DATA_LEN_MAPPER[dataId];

            if (startOffset > data.length) return;

            i++;
        }
        
        if (DEBUG)
        {
            console.log("@@@ dataCount " + dataCount + ", timeStamp " + timestamp);
        }

        var valueString = dataCount + ", ";

        values.forEach(function (value)
        {
            if (value instanceof Object)
            {
                if (value.w != undefined)
                {
                    valueString += value.w + ", ";
                }
                valueString += value.x + ", " + value.y + ", " + value.z + ", ";  
            }
            else 
            {
                valueString += value + ", ";
            }

            if (DEBUG)
            {
                console.log(valueString);
            }
        });

        this.csvFileStreams[this.requestFileDataId].write( valueString + "\n" );
    }

    startRecordingToFile(requestData)
    {
        if (this.exportedDir == undefined) return;

        var component = this;

        var fileName = this.tag + "_" + this.address.replace(/:/g, "") + "_" + this.selectedFileList[this.requestFileDataId - 1].fileName;

        var rootDirName;
        if(os.platform == 'darwin')
        {
            rootDirName = RECORDINGS_MAC_ROOT_PATH + RECORDINGS_PATH
        }
        else
        {
            rootDirName = process.cwd() + RECORDINGS_PATH;
        }
        mkdirs(rootDirName);

        mkdirs(rootDirName + this.exportedDir);

        var fullPath = rootDirName + this.exportedDir + fileName + ".csv";
    
        if (fs.existsSync(fullPath))
        {
            console.log('The logging file exists!');
            return;
        }

        console.log("fileStream path " + fullPath);

        this.sensorServer.sendXbusEvent("exportedDir", {exportedDir: (rootDirName + this.exportedDir)});
    
        this.csvFileStreams[this.requestFileDataId] = fs.createWriteStream( fullPath );
        
        const hrTime = process.hrtime();
        this.recordingStartTime = hrTime[0] * 1000000 + hrTime[1] / 1000;
        this.lastWriteTime = this.recordingStartTime;
    
        this.csvBuffer = "";
    
        this.csvFileStreams[this.requestFileDataId].on( 'open', function() 
        {
            console.log("csvFileStream open");

            component.csvFileStreams[component.requestFileDataId].write( "sep=,\n" );

            if (component.selectExportedDataIds != undefined)
            {
                var titleRow = LOGGING_DATA_TITLE_PACKET_COUNTER;
                var i = 0;

                while (i < component.selectExportedDataIds.length)
                {
                    var dataId = component.selectExportedDataIds[i];
                    titleRow += LOGGING_DATA_TITLE_MAPPER[dataId];        
                    i++;
                }

                component.csvFileStreams[component.requestFileDataId].write( titleRow + "\n" );
            }

            component.port.write(requestData, function(err) 
            {
                if (err) 
                {
                  return console.log('Error on write: ', err.message);
                }
    
                console.log('[requestFileData] message written hex ' + requestData.toString('hex'));
            });
        });
    
        this.csvFileStreams[this.requestFileDataId].on( 'close', function() 
        {
            console.log("csvFileStream close");
        });
    }

    retransmissionFileData(dataCount)
    {
        if (DEBUG) {
            console.log(this.portString + " retransmissionFileData " + dataCount);
        }

        var xbleDataLen = XBLE_DATA_LEN_RETRANSMISSION_FILE_DATA;
        var xbusLen = XBUS_DATA_LEN_RETRANSMISSION_FILE_DATA;

        var xbleData = Buffer.from([xbusLen, XBLE_MID_DATA_RECORDING, xbleDataLen, XBLE_MID_RETRANSMISSION_FILE_DATA, dataCount & 0xFF, (dataCount >> 8) & 0xFF, (dataCount >> 16) & 0xFF, (dataCount >> 24) & 0xFF]);

        var xbleCheckSumBuffer = checkSum(xbleData);
        xbleData = Buffer.concat([xbleData, xbleCheckSumBuffer]);

        var requestData = Buffer.concat([XBUS_HEADER, xbleData]);

        var checkSumBuffer = checkSum(requestData);
        requestData = Buffer.concat([requestData, checkSumBuffer]);

        this.port.write(requestData, function(err)
        {
            if (err)
            {
              return console.log('Error on write: ', err.message);
            }
    
            console.log('[selectExportedData] message written hex ' + requestData.toString('hex'));
        });
    }

    resetDataExportingVars()
    {
        this.expectedDataCount = 0;
        this.isRetry = 0;
        this.isRetryTimeout = 0;
        this.isDebugRetry = 0;
    }
}


// =======================================================================================
// Local functions
// =======================================================================================

// ---------------------------------------------------------------------------------------
// -- Compute checkSum --
// ---------------------------------------------------------------------------------------
function checkSum(bytesBuffer)
{
  var sum = 0;
  var len = bytesBuffer.length;

  for (i = 1; i < len; i++)
  {
    sum += bytesBuffer[i];
  }

  var checkSum = 0x000000FF & (0 - sum);
  var checkSumBytesBuffer = Buffer.from(new Uint8Array([checkSum]).buffer);

  console.log("sum " + sum + ", checkSum " + checkSum + ", 0x" + checkSumBytesBuffer.toString('hex'));
  
  return checkSumBytesBuffer;
}

// ---------------------------------------------------------------------------------------
// -- Get recording file name according to recording timestamp --
// ---------------------------------------------------------------------------------------
function getFileNameString(timestamp)
{
    var recordingDate = new Date(timestamp),
    y = recordingDate.getFullYear(),
    m = recordingDate.getMonth() + 1,
    d = recordingDate.getDate(),
    hours   = recordingDate.getHours(),
    minutes = recordingDate.getMinutes(),
    seconds = recordingDate.getSeconds();

    return y + "" + (m < 10 ? "0" + m : m) + "" + (d < 10 ? "0" + d : d) 
        + "_" + (hours < 10 ? "0" + hours : hours) 
        + (minutes < 10 ? "0" + minutes : minutes) 
        + (seconds < 10 ? "0" + seconds : seconds);
}

// ---------------------------------------------------------------------------------------
// -- Make dir --
// ---------------------------------------------------------------------------------------
function mkdirs(dirname)
{
    if (fs.existsSync(dirname))
    {
        return true;
    }
    else
    {
        fs.mkdirSync(dirname);
        return true;
    }
}

// ---------------------------------------------------------------------------------------
// -- Get data count --
// ---------------------------------------------------------------------------------------
function getDataCount(data, offset)
{
    return data.readUInt32LE(offset);
}

// ---------------------------------------------------------------------------------------
// -- Get timestamp --
// ---------------------------------------------------------------------------------------
function getTimestamp(data, offset)
{
    return data.readUInt32LE(offset);
}

// ---------------------------------------------------------------------------------------
// -- Get orientation quaternion --
// ---------------------------------------------------------------------------------------
function getOrientationQuaternion(data, offset)
{
    var w, x, y, z;
    
    w = data.readFloatLE(offset);
    x = data.readFloatLE(offset + 4);
    y = data.readFloatLE(offset + 8);
    z = data.readFloatLE(offset + 12);

    return {w: w, x: x, y: y, z: z};
}

// ---------------------------------------------------------------------------------------
// -- Get iq --
// ---------------------------------------------------------------------------------------
function getIq(data, offset)
{
    var x, y, z;
    
    x = data.readInt32LE(offset);
    y = data.readInt32LE(offset + 4);
    z = data.readInt32LE(offset + 8);

    return {x: x, y: y, z: z};
}

// ---------------------------------------------------------------------------------------
// -- Get iv --
// ---------------------------------------------------------------------------------------
function getIv(data, offset)
{
    var x, y, z;
    
    x = data.readInt32LE(offset);
    y = data.readInt32LE(offset + 4);
    z = data.readInt32LE(offset + 8);

    return {x: x, y: y, z: z};
}

// ---------------------------------------------------------------------------------------
// -- Get euler --
// ---------------------------------------------------------------------------------------
function getEuler(data, offset)
{
    var x, y, z;
    
    x = data.readFloatLE(offset);
    y = data.readFloatLE(offset + 4);
    z = data.readFloatLE(offset + 8);

    return {x: x, y: y, z: z};
}

// ---------------------------------------------------------------------------------------
// -- Get dq --
// ---------------------------------------------------------------------------------------
function getDq(data, offset)
{
    var w, x, y, z;
    
    w = data.readFloatLE(offset);
    x = data.readFloatLE(offset + 4);
    y = data.readFloatLE(offset + 8);
    z = data.readFloatLE(offset + 12);

    return {w: w, x: x, y: y, z: z};
}

// ---------------------------------------------------------------------------------------
// -- Get dv --
// ---------------------------------------------------------------------------------------
function getDv(data, offset)
{
    var x, y, z;
    
    x = data.readFloatLE(offset);
    y = data.readFloatLE(offset + 4);
    z = data.readFloatLE(offset + 8);

    return {x: x, y: y, z: z};
}

// ---------------------------------------------------------------------------------------
// -- Get acceleration --
// ---------------------------------------------------------------------------------------
function getAcceleration(data, offset)
{
    var x, y, z;
    
    x = data.readFloatLE(offset);
    y = data.readFloatLE(offset + 4);
    z = data.readFloatLE(offset + 8);

    return {x: x, y: y, z: z};
}

// ---------------------------------------------------------------------------------------
// -- Get angular velocity --
// ---------------------------------------------------------------------------------------
function getAngularVelocity(data, offset)
{
    var x, y, z;
    
    x = data.readFloatLE(offset);
    y = data.readFloatLE(offset + 4);
    z = data.readFloatLE(offset + 8);

    return {x: x, y: y, z: z};
}

// ---------------------------------------------------------------------------------------
// -- Get calibrated mag --
// ---------------------------------------------------------------------------------------
function getCalibratedMag(data, offset)
{
    var x, y, z;
    
    x = data.readInt16LE(offset);
    y = data.readInt16LE(offset + 2);
    z = data.readInt16LE(offset + 4);

    x = x / TWO_POW_TWELVE;
    y = y / TWO_POW_TWELVE;
    z = z / TWO_POW_TWELVE;

    return {x: x, y: y, z: z};
}

// ---------------------------------------------------------------------------------------
// -- Get snapshot status --
// ---------------------------------------------------------------------------------------
function getSnapshotStatus(data, offset)
{
    var status = data.readInt16LE(offset);
    status = (status & 0x1FF) << 8;

    return status;
}

// ---------------------------------------------------------------------------------------
// -- Get acceleration clip count --
// ---------------------------------------------------------------------------------------
function getClipCountAcc(data, offset)
{
    return  data.readInt8(offset);
}

// ---------------------------------------------------------------------------------------
// -- Get angular velocity clip count --
// ---------------------------------------------------------------------------------------
function getClipCountGyr(data, offset)
{
    return  data.readInt8(offset);
}

// ---------------------------------------------------------------------------------------
// -- Get data according to data id & offset --
// ---------------------------------------------------------------------------------------
function getRecordingData(dataBuffer, id, offset)
{
    switch(id)
    {
        case RECORDING_DATA_ID_TIMESTAMP:
            return getTimestamp(dataBuffer, offset);

        case RECORDING_DATA_ID_ORIENTATION:
            return getOrientationQuaternion(dataBuffer, offset);

        case RECORDING_DATA_ID_EULER_ANGLES:
            return getEuler(dataBuffer, offset);

        case RECORDING_DATA_ID_DQ:
            return getDq(dataBuffer, offset);

        case RECORDING_DATA_ID_DV:
            return getDv(dataBuffer, offset);
            
        case RECORDING_DATA_ID_CALIBRATED_ACC:
            return getAcceleration(dataBuffer, offset);
            
        case RECORDING_DATA_ID_CALIBRATED_GYR:
            return getAngularVelocity(dataBuffer, offset);

        case RECORDING_DATA_ID_CALIBRATED_MAG:
            return getCalibratedMag(dataBuffer, offset);

        case RECORDING_DATA_ID_STATUS:
            return getSnapshotStatus(dataBuffer, offset);
    }

}

// =======================================================================================
// Export the XBusHandler class
// =======================================================================================
module.exports = XBusHandler;
