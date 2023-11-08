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
// Client side scripting for the Xsens DOT Recording Exporter.
// =======================================================================================

var socket = io();

var eventHandlerFunctions = {};
setEventHandlerFunctions();

// Widgets
var scanHeaderLeftGroup,
    scanAllPortsButton,
    scanHeaderMiddleGroup,
    scanHeaderRightGroup,
    measurementPayloadList,
    tipMain,
    exportHeaderMiddleGroup,
    exportHeaderRightGroup,
    exportProgressBar,
    stopExportingButton,
    discoveredSensorList,
    exportingSensorList,
    exportButton,
    tipDataExporting,
    dataExportedDir,
    downloadAllContainer,
    exportConfigurationDialog,
    selectRecordingFilesDialog;

var discoveredSensors = [],
    exportingSensors  = [];

var exportingDataTotalSize = 0;
var exportedDataSizes = {};
var exportedSensorCount = 0;

const DEBUG = false;

const CLASS_NAME_SENSOR_SELECTION          = "sensor selection";
const ID_SELECT_FILE_TO_RECORDING_CHECKBOX = "SelectFileToRecording";

// =======================================================================================
// Export Configuration Dialog.
// =======================================================================================

// Export configuration selection values
const INPUT_VALUE_EULER_ANGLES     = "1";
const INPUT_VALUE_QUATERNION       = "2";
const INPUT_VALUE_ANGULAR_VELOCITY = "11";
const INPUT_VALUE_ACCELERATION     = "12";
const INPUT_VALUE_DQ               = "13";
const INPUT_VALUE_DV               = "14";
const INPUT_VALUE_MAGNETIC_FIELD   = "15";
const INPUT_VALUE_STATUS           = "16";

// Data bytes
const TOTAL_RECORDING_DATA_SIZE    = 115;
const DEFAULT_EXPORT_DATA_BYTES    = 40;
const DATA_BYTES_TIMESTAMP         = 4;
const DATA_BYTES_EULERANGLES       = 12;
const DATA_BYTES_QUATERNION        = 16;
const DATA_BYTES_ANGULAR_VELOCITY  = 12;
const DATA_BYTES_ACCELERATION      = 12;
const DATA_BYTES_DQ                = 16;
const DATA_BYTES_DV                = 12;
const DATA_BYTES_MAGNETIC_FIELD    = 6;
const DATA_BYTES_STATUS            = 2;

var exportDataBytes     = DEFAULT_EXPORT_DATA_BYTES;
var tempExportDataBytes = exportDataBytes;
var selectedDatabytesLabel;
var eulerAnglesRadio;
var quaternionRadio;
var angularVelocityCheckBox;
var accelerationCheckBox;
var dqCheckBox;
var dvCheckBox;
var magneticFieldCheckBox;
var statusCheckBox;
var setAsDefaultButton;
var confirmCofigButton;

var lastCheckStatusEulerAngles     = true;
var lastCheckStatusQuaternion      = false;
var lastCheckStatusAngularVelocity = true;
var lastCheckStatusAcceleration    = true;
var lastCheckStatusDq              = false;
var lastCheckStatusDv              = false;
var lastCheckStatusMagneticField   = false;
var lastCheckStatusStatus          = false;

// =======================================================================================
// Select Recording Files Dialog.
// =======================================================================================
var recordingFileList;
var selectAllFilesButton;

var currentSensorToSelectRecordingFiles;

const ID_RECORDING_FILE_ITEM     = "recordingFileItem";
const ID_RECORDING_FILE_CHECKBOX = "recordingFileCheckbox";

const CLASS_NAME_RECORDING_FILES_SELECTION = "recording files selection";
const CLASS_NAME_SENSOR_EXPORTING_STATUS   = "sensor exporting status";

// =======================================================================================
// Select Recording Files Dialog.
// =======================================================================================
const ID_EXPORT_STATUS   = "export_status";
const STATUS_IN_PROGRESS = "In Progress";
const STATUS_STOPPED     = "Stopped";
const STATUS_COMPLETED   = "Completed";

var scanningTimeoutId;

var measuringPayloadId     = -1;

var lastSensorsDataTimeMap = [];
var lastSensorDataTime     = 0;

const EVENT_GUI            = 'guiEvent';

const ID_LOGO_IMAGE                    = "logoImage";
const ID_TAG_DISCOVER                  = "tagDiscover";
const ID_TAG_EXPORTING                 = "tagExporting";
const ID_MAC_ADDRESS_DISCOVER          = "macAddressDiscover";
const ID_MAC_ADDRESS_EXPORTING         = "macAddressExporting";
const ID_STORAGE_SPACE                 = "storageSpace";
const ID_CLEAR_STORAGE_BUTTON          = "clearStorageButton";
const ID_SELECT_RECORDING_FILES_BUTTON = "selectRecordingFilesButton";

const TEXT_CONNECT    = "Connect";
const TEXT_DISCONNECT = "Disconnect";

window.onload = function(eventName, parameters)
{
    scanHeaderLeftGroup        = document.getElementById("scanHeaderLeftGroup");
    scanAllPortsButton         = document.getElementById("scanAllPortsButton");
    scanHeaderMiddleGroup      = document.getElementById("scanHeaderMiddleGroup");
    scanHeaderRightGroup       = document.getElementById("scanHeaderRightGroup");
    measurementPayloadList     = document.getElementById("measurementPayloadList");
    tipMain                    = document.getElementById("tipMain");

    exportHeaderMiddleGroup    = document.getElementById("exportHeaderMiddleGroup");
    exportHeaderRightGroup     = document.getElementById("exportHeaderRightGroup");
    exportProgressBar          = document.getElementById("exportProgressBar");
    stopExportingButton        = document.getElementById("stopExportingButton");
    discoveredSensorList       = document.getElementById("discoveredSensors");
    exportingSensorList        = document.getElementById("exportingSensors");
    exportButton               = document.getElementById("exportButton");
    tipDataExporting           = document.getElementById("tipDataExporting");
    dataExportedDir            = document.getElementById("dataExportedDir");
    downloadAllContainer       = document.getElementById("downloadAllContainer");

    exportConfigurationDialog  = document.getElementById('exportConfigurationDialog');
    selectRecordingFilesDialog = document.getElementById('selectRecordingFilesDialog');
    
    selectedDatabytesLabel     = document.getElementById('selectedDatabytes');
    eulerAnglesRadio           = document.getElementById('eulerAngles');
    quaternionRadio            = document.getElementById('quaternion');
    angularVelocityCheckBox    = document.getElementById('angularVelocity');
    accelerationCheckBox       = document.getElementById('acceleration');
    dqCheckBox                 = document.getElementById('dq');
    dvCheckBox                 = document.getElementById('dv');
    magneticFieldCheckBox      = document.getElementById('magneticField');
    statusCheckBox             = document.getElementById('status');
    setAsDefaultButton         = document.getElementById('setAsDefault');
    confirmCofigButton         = document.getElementById('confirm');

    recordingFileList          = document.getElementById('recordingFileList');
    selectAllFilesButton       = document.getElementById('selectAllFilesButton');

    tipMain.hidden = false;

    sendGuiEvent('startScanning', {});
}

window.onunload = function(eventName, parameters)
{
}

function setEventHandlerFunctions()
{
    eventHandlerFunctions['sensorDiscovered'] = function(eventName, parameters)
    {
        console.log("sensorDiscovered " + parameters.port + ", " + parameters.pnpId + ", " + parameters.address);

        addSensorToList(discoveredSensors, "discoveredSensors", parameters);

        disableClearStorageButton(parameters.port, true);

        sendGuiEvent('requestMacAddress', {port: parameters.port});
    };

    eventHandlerFunctions['clearSensorStorageDone'] = function(eventName, parameters)
    {
        console.log("clearSensorStorageDone " + parameters.port);

        disableClearStorageButton(parameters.port, false);
    };
    
    eventHandlerFunctions['clearSensorStorageError'] = function(eventName, parameters)
    {
        console.log("clearSensorStorageError " + parameters.port);

        disableClearStorageButton(parameters.port, false);
    };

    eventHandlerFunctions['getMacAddressDone'] = function(eventName, parameters)
    {
        console.log("getMacAddressDone " + parameters.port + ", " + parameters.address);

        updateMacAddress(parameters);
    };
    
    eventHandlerFunctions['getSensorTagDone'] = function(eventName, parameters)
    {
        console.log("getSensorTagDone " + parameters.port + ", " + parameters.tag);

        updateTag(parameters);
    };

    eventHandlerFunctions['exportFlashInfoDone'] = function(eventName, parameters)
    {
        console.log("exportFlashInfoDone " + parameters.port);

        disableClearStorageButton(parameters.port, false);
    };

    eventHandlerFunctions['updateFlashInfo'] = function(eventName, parameters)
    {
        console.log("updateFlashInfo " + parameters.port + ", storageSpace " + parameters.storageSpace);

        updateFlashInfo(parameters);
    };

    eventHandlerFunctions['exportFileInfoDone'] = function(eventName, parameters)
    {
        console.log("exportFileInfoDone " + parameters.port);

        updateFileInfo(parameters);
    };

    eventHandlerFunctions['exportedFileDataBytes'] = function(eventName, parameters)
    {
        updateProgress(parameters);
    };

    eventHandlerFunctions['exportFileDataDone'] = function(eventName, parameters)
    {
        console.log("exportFileDataDone " + parameters.port + ", file index " + parameters.fileIndex);

        if (parameters.isAllDone)
        {
            exportedSensorCount++;
            updateExportingStatus(parameters.port, STATUS_COMPLETED);
        }

        //All done
        if (exportedSensorCount == exportingSensors.length)
        {
            exportProgressBar.style.width = "100%";

            if (stopExportingButton.innerHTML == "Stop")
            {
                // stop exporting
                stopExportingButton.innerHTML = "Finish";
                exportingSensorList.hidden = false;
                tipDataExporting.hidden = true;
                dataExportedDir.hidden = false;

                downloadAllContainer.hidden = true /*false*/; // TODO
            }
        }
    };

    eventHandlerFunctions['exportedDir'] = function(eventName, parameters)
    {
        console.log("exportedDir " + parameters.exportedDir);

        dataExportedDir.innerHTML = "Recording file(s) stored in: \n" + parameters.exportedDir;
    };

    eventHandlerFunctions['sensorClosed'] = function(eventName, parameters)
    {
        console.log("sensorClosed " + parameters.port);

        discoveredSensors.forEach(function(sensor)
        {
            if (sensor.port == parameters.port)
            {
                removeSensorFromList(discoveredSensors, "discoveredSensors", sensor);
            }
        })
    };
}

function guiEventHandler(eventName, parameters)
{
    if(eventHandlerFunctions[eventName] == undefined)
    {
        console.log("WARNING: unhandled GUI event: " + eventName);
        return;
    }
    eventHandlerFunctions[eventName](eventName, parameters);
}

function scanAllPortsButtonClicked()
{
    scanAllPortsButton.disabled = true;

    while( discoveredSensors.length != 0 )
    {
        removeSensorFromList(discoveredSensors, "discoveredSensors", discoveredSensors[0]);
    }

    updateExportButton();

    sendGuiEvent('startScanning', {});

    setTimeout(() => {
        scanAllPortsButton.disabled = false;
    }, 1500);
}

function exportButtonClicked()
{
    exportingSensors = [];
    exportingDataTotalSize = 0;
    exportedDataSizes = {};
    exportedSensorCount = 0;

    while (exportingSensorList.lastElementChild) 
    {
        exportingSensorList.removeChild(exportingSensorList.lastElementChild);
    }

    var checkboxes = document.getElementsByClassName(CLASS_NAME_SENSOR_SELECTION);

    for(i = 0; i < checkboxes.length; i++)
    {
        if (checkboxes[i].checked)
        {
            var port = checkboxes[i].getAttribute("name");

            discoveredSensors.forEach(function(sensor)
            {
                if (sensor.port == port)
                {
                    exportingSensors.push(sensor);

                    addExportingSensorToList(sensor);

                    sensor.selectedFileList.forEach(function(item)
                    {
                        exportingDataTotalSize += item.size;
                    });

                    return true;
                }
            });
        }
    }

    if (exportingSensors.length == 0) return;

    sendGuiEvent('requestFileData', {exportingSensors: exportingSensors});

    scanHeaderLeftGroup.hidden = true;
    scanHeaderMiddleGroup.hidden = true;
    scanHeaderRightGroup.hidden = true;
    discoveredSensorList.hidden = true;
    tipMain.hidden = true;

    exportHeaderMiddleGroup.hidden = false;
    exportHeaderRightGroup.hidden = false;
    exportProgressBar.style.width = "1%";
    exportingSensorList.hidden = false;
    tipDataExporting.hidden = false;
    dataExportedDir.hidden = false;
    downloadAllContainer.hidden = true;

    stopExportingButton.innerHTML = "Stop";
}

function stopExportingButtonClicked()
{
    if (stopExportingButton.innerHTML == "Stop")
    {
        sendGuiEvent('stopExportingFileData', {exportingSensors: exportingSensors});

        stopExportingButton.innerHTML = "Finish";
        exportingSensorList.hidden = false;
        tipDataExporting.hidden = true;
        dataExportedDir.hidden = false;

        downloadAllContainer.hidden = true /*false*/; // TODO

        var statusItems = document.getElementsByClassName(CLASS_NAME_SENSOR_EXPORTING_STATUS);
        for(i = 0; i < statusItems.length; i++)
        {
            if (statusItems[i].innerHTML == STATUS_IN_PROGRESS)
            {
                statusItems[i].innerHTML = STATUS_STOPPED;
            }
        }
    }
    else
    {
        scanHeaderLeftGroup.hidden = false;
        scanHeaderMiddleGroup.hidden = false;
        scanHeaderRightGroup.hidden = false;
        discoveredSensorList.hidden = false;
        tipMain.hidden = false;
    
        exportHeaderMiddleGroup.hidden = true;
        exportHeaderRightGroup.hidden = true;
        exportingSensorList.hidden = true;
        tipDataExporting.hidden = true;
        dataExportedDir.hidden = true;
        downloadAllContainer.hidden = true;

        dataExportedDir.innerHTML = "";
    }
}

function updateExportingStatus(port, status)
{
    var element = document.getElementById(ID_EXPORT_STATUS + port);
    if (element != null)
    {
        element.innerHTML = status;
    }
}

function downloadAllButtonClicked()
{
    // TODO
}

function addSensorToList(sensorList, sensorListName, sensor)
{
    // Filter exist sensor
    var foundExistItem = false;

    sensorList.some(function(item)
    {
        if (sensor.port == item.port && sensor.address == item.address)
        {
            console.log("Sensor already in list");

            foundExistItem = true;
            return true;
        }
    });

    if (foundExistItem) return;

    sensorList.push(sensor);

    var sensorListElement = document.getElementById(sensorListName);

    var label = document.createElement("div");
    label.setAttribute("id", sensorListName + sensor.port);
    label.style.width = "600px";
    label.style.display = "flex";
    label.style.textAlign = "center";
    label.style.paddingTop = "6px";
    label.style.paddingBottom = "6px";

    sensorListElement.appendChild(label);

    var checkbox = document.createElement("input");
    checkbox.setAttribute("id", ID_SELECT_FILE_TO_RECORDING_CHECKBOX + sensor.port);
    checkbox.setAttribute("type", "checkbox");
    checkbox.setAttribute("name", sensor.port);
    checkbox.setAttribute("class", CLASS_NAME_SENSOR_SELECTION);
    checkbox.style.margin = "auto";
    checkbox.style.marginRight = "8px";
    checkbox.disabled = true;
    checkbox.onchange = updateExportButton;
    label.appendChild(checkbox);

    var logo = document.createElement("img");
    logo.id = ID_LOGO_IMAGE + sensor.port;
    logo.src = "Xsens_DOT_connected.png";
    logo.style.width = "32px";
    logo.style.height = "38px";
    logo.style.margin = "auto";

    label.appendChild(logo);

    var sensorTagAddressDiv = document.createElement("div");
    sensorTagAddressDiv.style.width = "176px";
    sensorTagAddressDiv.style.marginLeft = "6px";

    var sensorTagDiv = document.createElement("div");
    sensorTagDiv.style.width = "176px";
    sensorTagDiv.style.padding = "2px";

    var sensorTag = document.createElement('label');
    sensorTag.id = ID_TAG_DISCOVER + sensor.port;
    sensorTag.innerHTML = sensor.tag;
    sensorTag.style.padding = "2px";
    sensorTag.style.color = "#FFFFFF";
    sensorTag.style.width = "170px";
    sensorTag.style.fontSize = "14px";
    sensorTag.style.textAlign = "left";
    sensorTag.style.float = "left";
    sensorTagDiv.appendChild(sensorTag);

    var sensorAddressDiv = document.createElement("div");
    sensorAddressDiv.style.width = "176px";
    sensorAddressDiv.style.padding = "2px";

    var sensorAddress = document.createElement('label');
    sensorAddress.id = ID_MAC_ADDRESS_DISCOVER + sensor.port;
    sensorAddress.innerHTML = sensor.address;
    sensorAddress.style.padding = "2px";
    sensorAddress.style.color = "#AFAFAF";
    sensorAddress.style.width = "170px";
    sensorAddress.style.fontSize = "14px";
    sensorAddress.style.float = "left";
    sensorAddress.style.textAlign = "left";
    sensorAddressDiv.appendChild(sensorAddress);

    sensorTagAddressDiv.appendChild(sensorTagDiv);
    sensorTagAddressDiv.appendChild(sensorAddressDiv);
    label.appendChild(sensorTagAddressDiv);

    var sensorSpaceDiv = document.createElement("div");
    sensorSpaceDiv.style.flex = "1";
    sensorSpaceDiv.style.marginLeft = "1px";
    sensorSpaceDiv.style.display = "flex";
    sensorSpaceDiv.style.textAlign = "center";

    var spaceInfo = document.createElement('label');
    spaceInfo.id = ID_STORAGE_SPACE + sensor.port;
    spaceInfo.style.width = "146px";
    spaceInfo.style.color = "#AFAFAF";

    spaceInfo.style.padding = "2px";
    spaceInfo.style.fontSize = "12px";
    spaceInfo.style.float = "left";
    spaceInfo.style.textAlign = "center";
    spaceInfo.style.margin = "auto";
    spaceInfo.style.marginLeft = "2px";
    spaceInfo.style.marginRight = "2px";
    
    var clearButton = document.createElement("button");
    clearButton.id = ID_CLEAR_STORAGE_BUTTON + sensor.port;
    clearButton.name = sensor.port;
    clearButton.style.color = "#FFFFFF";
    clearButton.innerHTML = "Clear";
    clearButton.style.margin = "auto";
    clearButton.style.marginLeft = "2px";
    initButtonStyle(clearButton);
    clearButton.style.width = "48px";

    clearButton.onclick = clearStorageButtonClicked;
    clearButton.onmouseover = onButtonMouseOver;
    clearButton.onmouseout = onButtonMouseOut;

    sensorSpaceDiv.appendChild(spaceInfo);
    sensorSpaceDiv.appendChild(clearButton);
    label.appendChild(sensorSpaceDiv);


    var selectRecordingFilesButton = document.createElement("label");
    selectRecordingFilesButton.style.width = "140px";
    selectRecordingFilesButton.id = ID_SELECT_RECORDING_FILES_BUTTON + sensor.port;
    selectRecordingFilesButton.name = sensor.port;
    selectRecordingFilesButton.style.color = "#FFFFFF";
    selectRecordingFilesButton.style.fontSize = "14px";
    selectRecordingFilesButton.innerHTML = 0 + " File Selected >";
    selectRecordingFilesButton.style.margin = "auto";

    selectRecordingFilesButton.onclick = selectRecordingFilesButtonClicked;
    selectRecordingFilesButton.onmouseover = onTextMouseOver;
    selectRecordingFilesButton.onmouseout = onTextMouseOut;

    label.appendChild(selectRecordingFilesButton);

    var newLine = document.createElement( "br" );
    label.appendChild(newLine);
}

function addExportingSensorToList(sensor)
{
    var label = document.createElement("div");
    label.setAttribute("id", "exportingSensors" + sensor.port);
    label.style.width = "600px";
    label.style.display = "flex";
    label.style.textAlign = "center";
    label.style.paddingTop = "6px";
    label.style.paddingBottom = "6px";

    exportingSensorList.appendChild(label);

    var logo = document.createElement("img");
    logo.id = ID_LOGO_IMAGE + sensor.port;
    logo.src = "Xsens_DOT_connected.png";
    logo.style.width = "32px";
    logo.style.height = "38px";
    logo.style.margin = "auto";

    label.appendChild(logo);

    var sensorTagAddressDiv = document.createElement("div");
    sensorTagAddressDiv.style.width = "184px";
    sensorTagAddressDiv.style.marginLeft = "6px";
    var sensorTagDiv = document.createElement("div");
    sensorTagDiv.style.width = "184px";
    sensorTagDiv.style.padding = "2px";

    var sensorTag = document.createElement('label');
    sensorTag.id = ID_TAG_EXPORTING + sensor.port;
    sensorTag.innerHTML = sensor.tag;
    sensorTag.style.padding = "2px";
    sensorTag.style.color = "#FFFFFF";
    sensorTag.style.width = "180px";
    sensorTag.style.fontSize = "14px";
    sensorTag.style.textAlign = "left";
    sensorTag.style.float = "left";
    sensorTagDiv.appendChild(sensorTag);

    var sensorAddressDiv = document.createElement("div");
    sensorAddressDiv.style.width = "184px";
    sensorAddressDiv.style.padding = "2px";

    var sensorAddress = document.createElement('label');
    sensorAddress.id = ID_MAC_ADDRESS_EXPORTING + sensor.port;
    sensorAddress.innerHTML = sensor.address;
    sensorAddress.style.padding = "2px";
    sensorAddress.style.color = "#AFAFAF";
    sensorAddress.style.width = "180px";
    sensorAddress.style.fontSize = "14px";
    sensorAddress.style.float = "left";
    sensorAddress.style.textAlign = "left";
    sensorAddressDiv.appendChild(sensorAddress);

    sensorTagAddressDiv.appendChild(sensorTagDiv);
    sensorTagAddressDiv.appendChild(sensorAddressDiv);
    label.appendChild(sensorTagAddressDiv);

    var placeHolder = document.createElement('label');
    placeHolder.style.padding = "2px";
    placeHolder.style.color = "#AFAFAF";
    placeHolder.style.flex = "1";
    placeHolder.style.fontSize = "14px";
    placeHolder.style.float = "left";
    placeHolder.style.textAlign = "center";
    placeHolder.style.margin = "auto";
    label.appendChild(placeHolder);

    var status = document.createElement("label");
    status.setAttribute("class", CLASS_NAME_SENSOR_EXPORTING_STATUS);
    status.style.width = "140px";
    status.id = ID_EXPORT_STATUS + sensor.port;
    status.name = sensor.port;
    status.style.color = "#AFAFAF";
    status.innerHTML = STATUS_IN_PROGRESS;
    status.style.margin = "auto";

    label.appendChild(status);

    var newLine = document.createElement( "br" );
    label.appendChild(newLine);
}

function initButtonStyle(button)
{
    button.style.width = "48px";
    button.style.height = "28px";
    button.style.outline = "none";
    button.style.border = "2px solid #43425D";
    button.style.borderRadius = "4px";
    button.style.opacity = "1";
    button.style.textAlign = "center";
    button.style.font = "11px 'Montserrat'";
    button.style.letterSpacing = "0";
    button.style.color = "#EA6852";
    button.style.fontWeight = "bold";
    button.style.background = "#FFFFFF";
}

function onButtonMouseOver()
{
    this.style.width = "48px";
    this.style.height = "28px";
    this.style.outline = "none";
    this.style.border = "2px solid #43425D";
    this.style.borderRadius = "4px";
    this.style.opacity = "1";
    this.style.textAlign = "center";
    this.style.font = "11px 'Montserrat'";
    this.style.letterSpacing = "0";
    this.style.color = "#FFFFFF";
    this.style.fontWeight = "bold";
    this.style.background = "#EA6852";
}

function onButtonMouseOut()
{
    initButtonStyle(this);
}

function onTextMouseOver()
{
    this.style.color = "#EA6852";
}

function onTextMouseOut()
{
    this.style.color = "#FFFFFF";
}

function updateExportButton()
{
    var hasCheckedCheckbox = false;

    var checkboxes = document.getElementsByClassName(CLASS_NAME_SENSOR_SELECTION);

    for(i = 0; i < checkboxes.length; i++)
    {
        if (checkboxes[i].checked)
        {
            var port = checkboxes[i].getAttribute("name");

            discoveredSensors.some(function(sensor)
            {
                if (sensor.port == port && sensor.selectedFileList.length > 0)
                {
                    hasCheckedCheckbox = true;
                    return true;   
                }
            });

            if (hasCheckedCheckbox) break;
        }
    }

    exportButton.disabled = !hasCheckedCheckbox;
}

function clearStorageButtonClicked()
{
    var port = this.name;

    disableClearStorageButton(port, true);

    sendGuiEvent('clearSensorStorage', {port: port});
}

function disableClearStorageButton(port, disabled)
{
    var element = document.getElementById(ID_CLEAR_STORAGE_BUTTON + port);
    if (element != null)
    {
        if (disabled)
        {
            element.style.color      = "#FFFFFF";
            element.style.background = "#AFAFAF";
        }
        else
        {
            element.style.color      = "#EA6852";
            element.style.background = "#FFFFFF";
        }

        element.disabled = disabled;
    }
}

function updateMacAddress(parameters)
{
    discoveredSensors.some(function (sensor)
    {
        if (sensor.port == parameters.port)
        {
            sensor.address = parameters.address;
            return true;
        }
    });

    var macAddressText = document.getElementById(ID_MAC_ADDRESS_DISCOVER + parameters.port);
    if (macAddressText != null)
    {
        macAddressText.innerHTML = parameters.address;
    }

    macAddressText = document.getElementById(ID_MAC_ADDRESS_EXPORTING + parameters.port);
    if (macAddressText != null)
    {
        macAddressText.innerHTML = parameters.address;
    }
}

function updateTag(parameters)
{
    discoveredSensors.some(function (sensor)
    {
        if (sensor.port == parameters.port)
        {
            sensor.tag = parameters.tag;
            return true;
        }
    });

    var tagText = document.getElementById(ID_TAG_DISCOVER + parameters.port);
    if (tagText != null)
    {
        tagText.innerHTML = parameters.tag;
    }

    tagText = document.getElementById(ID_TAG_EXPORTING + parameters.port);
    if (tagText != null)
    {
        tagText.innerHTML = parameters.tag;
    }
}

function updateFlashInfo(parameters)
{
    var element = document.getElementById(ID_STORAGE_SPACE + parameters.port);
    if (element != null)
    {
        var percent = Math.floor((parameters.avaiableStorageSpace * 100) / parameters.storageSpace);

        if (percent > 0)
        {
            element.innerHTML = "Space available: " + percent + "%";
            element.style.color = "#AFAFAF";
        }
        else 
        {
            element.innerHTML = "Storage space full";
            element.style.color = "#EA6852";
        }
    }
}

function updateFileInfo(parameters)
{
    discoveredSensors.some(function(sensor)
    {
        if (sensor.port == parameters.port)
        {
            var fileList = parameters.fileList;

            if (fileList.length == 0)
            {
                sensor.selectedFileList = [];
            }

            if (sensor.selectedFileList.length == 0 && fileList.length != 0)
            {
                sensor.selectedFileList.push(fileList[fileList.length - 1]);
            }

            sensor.fileList = fileList;
            sensor.fileList.reverse();


            var selectRecordingFilesButton = document.getElementById(ID_SELECT_RECORDING_FILES_BUTTON + sensor.port);

            if (selectRecordingFilesButton != undefined)
            {
                if (sensor.selectedFileList.length > 1)
                {
                    selectRecordingFilesButton.innerHTML = sensor.selectedFileList.length + " Files Selected >";
                }
                else
                {
                    selectRecordingFilesButton.innerHTML = sensor.selectedFileList.length + " File Selected >";
                }

                var checkbox = document.getElementById(ID_SELECT_FILE_TO_RECORDING_CHECKBOX + sensor.port);
                checkbox.disabled = sensor.selectedFileList.length == 0;
            }

            return true;
        }
    });
}

function updateProgress(parameters)
{
    var allExportedDataBytes = 0;

    exportedDataSizes[parameters.port] = parameters.totalDataBytes;

    exportingSensors.forEach(function (sensor)
    {
        var size = exportedDataSizes[sensor.port];

        if (size != null || size != undefined)
        {
            allExportedDataBytes += size;
        }
    });

    var totalSize = (exportingDataTotalSize * exportDataBytes / TOTAL_RECORDING_DATA_SIZE) * 2.25;

    if (DEBUG)
    {
        console.log(" update progress " + parameters.port + ", each exportDataBytes " + exportDataBytes + ", exported total bytes " + allExportedDataBytes + ", total " + totalSize);
    }

    var percent = Math.floor((allExportedDataBytes * 100) / totalSize);
    exportProgressBar.style.width = percent + "%";
}

function removeSensorFromList(sensorList, sensorListName, sensor)
{
    var idx = sensorList.indexOf(sensor);
    if( idx == -1 ) return;

    var element = document.getElementById(sensorListName + sensor.port);
    element.parentNode.removeChild(element);

    sensorList.splice(idx,1);
}

function onSensorFusionDataChange(radioButton, value)
{
    console.log("onSensorFusionDataChange " + radioButton.checked + ", " + value);

    if (radioButton.checked)
    {
        switch(value)
        {
            case INPUT_VALUE_EULER_ANGLES:
                if (quaternionRadio.checked)
                {
                    quaternionRadio.checked = false;
                    tempExportDataBytes = tempExportDataBytes - DATA_BYTES_QUATERNION + DATA_BYTES_EULERANGLES;
                }
                else
                {
                    tempExportDataBytes = tempExportDataBytes + DATA_BYTES_EULERANGLES;
                }
                break;
    
            case INPUT_VALUE_QUATERNION:
                if (eulerAnglesRadio.checked)
                {
                    eulerAnglesRadio.checked = false;
                    tempExportDataBytes = tempExportDataBytes - DATA_BYTES_EULERANGLES + DATA_BYTES_QUATERNION;
                }
                else
                {
                    tempExportDataBytes = tempExportDataBytes + DATA_BYTES_QUATERNION;
                }
                break;
        }
    }
    else
    {
        switch(value)
        {
            case INPUT_VALUE_EULER_ANGLES:
                tempExportDataBytes = tempExportDataBytes - DATA_BYTES_EULERANGLES;
                break;
    
            case INPUT_VALUE_QUATERNION:
                tempExportDataBytes = tempExportDataBytes - DATA_BYTES_QUATERNION;
                break;
        }
    }

    updateExportConfigurationDialog();
}

function onInertialDataChange(checkBox, value)
{
    console.log("onInertialDataChange " + checkBox.checked + ", " + value);

    switch(value)
    {
        case INPUT_VALUE_ANGULAR_VELOCITY:
            updateConfigSelectedBytes(checkBox, DATA_BYTES_ANGULAR_VELOCITY);
            break;

        case INPUT_VALUE_ACCELERATION:
            updateConfigSelectedBytes(checkBox, DATA_BYTES_ACCELERATION);
            break;

        case INPUT_VALUE_DQ:
            updateConfigSelectedBytes(checkBox, DATA_BYTES_DQ);
            break;

        case INPUT_VALUE_DV:
            updateConfigSelectedBytes(checkBox, DATA_BYTES_DV);
            break;

        case INPUT_VALUE_MAGNETIC_FIELD:
            updateConfigSelectedBytes(checkBox, DATA_BYTES_MAGNETIC_FIELD);
            break;

        case INPUT_VALUE_STATUS:
            updateConfigSelectedBytes(checkBox, DATA_BYTES_STATUS);
            break;
    }
}

function updateConfigSelectedBytes(checkBox, bytes)
{
    if (checkBox.checked)
    {
        tempExportDataBytes = tempExportDataBytes + bytes;
    }
    else
    {
        tempExportDataBytes = tempExportDataBytes - bytes;
    }

    updateExportConfigurationDialog();
}

function updateExportConfigurationDialog()
{
    selectedDatabytesLabel.innerHTML = tempExportDataBytes + " Bytes";

    var defaultSelection = (
        eulerAnglesRadio.checked 
        && angularVelocityCheckBox.checked 
        && accelerationCheckBox.checked 
        && tempExportDataBytes == DEFAULT_EXPORT_DATA_BYTES);

    setAsDefaultButton.disabled = defaultSelection;

    confirmCofigButton.disabled = tempExportDataBytes <= DATA_BYTES_TIMESTAMP;
}

function setToDefaultSettings()
{
    console.log("setToDefaultSettings");

    eulerAnglesRadio.checked        = true;
    quaternionRadio.checked         = false;
    angularVelocityCheckBox.checked = true;
    accelerationCheckBox.checked    = true;
    dqCheckBox.checked              = false;
    dvCheckBox.checked              = false;
    magneticFieldCheckBox.checked   = false;
    statusCheckBox.checked          = false;

    lastCheckStatusEulerAngles      = true;
    lastCheckStatusQuaternion       = false;
    lastCheckStatusAngularVelocity  = true;
    lastCheckStatusAcceleration     = true;
    lastCheckStatusDq               = false;
    lastCheckStatusDv               = false;
    lastCheckStatusMagneticField    = false;
    lastCheckStatusStatus           = false;

    tempExportDataBytes = DEFAULT_EXPORT_DATA_BYTES;
    exportDataBytes     = DEFAULT_EXPORT_DATA_BYTES;

    updateExportConfigurationDialog();
}

function settingsButtonClicked()
{
    exportConfigurationDialog.showModal();
}

function cancelSettingsDialog()
{
    tempExportDataBytes = exportDataBytes;

    eulerAnglesRadio.checked        = lastCheckStatusEulerAngles;
    quaternionRadio.checked         = lastCheckStatusQuaternion;
    angularVelocityCheckBox.checked = lastCheckStatusAngularVelocity;
    accelerationCheckBox.checked    = lastCheckStatusAcceleration;
    dqCheckBox.checked              = lastCheckStatusDq;
    dvCheckBox.checked              = lastCheckStatusDv;
    magneticFieldCheckBox.checked   = lastCheckStatusMagneticField;
    statusCheckBox.checked          = lastCheckStatusStatus;

    updateExportConfigurationDialog();

    exportConfigurationDialog.close();
}

function confirmSettingsDialog()
{
    exportDataBytes = tempExportDataBytes;

    lastCheckStatusEulerAngles = eulerAnglesRadio.checked;
    lastCheckStatusQuaternion = quaternionRadio.checked;
    lastCheckStatusAngularVelocity = angularVelocityCheckBox.checked;
    lastCheckStatusAcceleration = accelerationCheckBox.checked;
    lastCheckStatusDq = dqCheckBox.checked;
    lastCheckStatusDv = dvCheckBox.checked;
    lastCheckStatusMagneticField = magneticFieldCheckBox.checked;
    lastCheckStatusStatus = statusCheckBox.checked;

    var selectExportedDataIds = [];
    var startIndex = 0;

    // Timestamp
    selectExportedDataIds[startIndex] = 0x00;
    startIndex++;

    if (lastCheckStatusQuaternion)
    {
        selectExportedDataIds[startIndex] = 0x01;
        startIndex++;
    }

    if (lastCheckStatusEulerAngles)
    {
        selectExportedDataIds[startIndex] = 0x04;
        startIndex++;
    }

    if (lastCheckStatusDq)
    {
        selectExportedDataIds[startIndex] = 0x05;
        startIndex++;
    }

    if (lastCheckStatusDv)
    {
        selectExportedDataIds[startIndex] = 0x06;
        startIndex++;
    }

    if (lastCheckStatusAcceleration)
    {
        selectExportedDataIds[startIndex] = 0x07;
        startIndex++;
    }

    if (lastCheckStatusAngularVelocity)
    {
        selectExportedDataIds[startIndex] = 0x08;
        startIndex++;
    }

    if (lastCheckStatusMagneticField)
    {
        selectExportedDataIds[startIndex] = 0x09;
        startIndex++;
    }

    if (lastCheckStatusStatus)
    {
        selectExportedDataIds[startIndex] = 0x0A;
        startIndex++;
    }

    discoveredSensors.forEach(function(sensor)
    {
        sendGuiEvent('selectExportedData', {port: sensor.port, selectExportedDataIds: selectExportedDataIds});
    });

    exportConfigurationDialog.close();
}

function selectRecordingFilesButtonClicked()
{
    while (recordingFileList.lastElementChild) 
    {
        recordingFileList.removeChild(recordingFileList.lastElementChild);
    }

    var id = this.id;

    if (id.startsWith(ID_SELECT_RECORDING_FILES_BUTTON))
    {
        var selectPort = id.substring(ID_SELECT_RECORDING_FILES_BUTTON.length, id.length);

        console.log("selectPort " + selectPort);

        discoveredSensors.some(function(sensor)
        {
            if (sensor.port == selectPort)
            {
                currentSensorToSelectRecordingFiles = sensor;

                sensor.fileList.forEach(function(fileItem)
                {
                    var isSelected = false;

                    sensor.selectedFileList.some(function(item)
                    {
                        if (item.fileName == fileItem.fileName)
                        {
                            isSelected = true;
                            return true;
                        }
                    });

                    var label = document.createElement("div");
                    label.setAttribute("id", ID_RECORDING_FILE_ITEM + fileItem.fileName);
                    label.style.width = "100%";
                    label.style.display = "flex";
                    label.style.textAlign = "center";
                    label.style.paddingTop = "6px";
                    label.style.paddingBottom = "6px";
            
                    recordingFileList.appendChild(label);

                    var checkbox = document.createElement("input");
                    checkbox.setAttribute("id", ID_RECORDING_FILE_CHECKBOX + fileItem.fileName);
                    checkbox.setAttribute("type", "checkbox");
                    checkbox.setAttribute("index", fileItem.index);
                    checkbox.setAttribute("name", fileItem.fileName);
                    checkbox.setAttribute("size", fileItem.size);
                    checkbox.setAttribute("class", CLASS_NAME_RECORDING_FILES_SELECTION);
                    checkbox.style.margin = "auto";
                    checkbox.style.marginRight = "8px";
                    checkbox.checked = isSelected;
                    checkbox.onchange = updateSelectAll;
                    label.appendChild(checkbox);
            
                    var fileName = document.createElement('label');
                    fileName.innerHTML = fileItem.fileName;
                    fileName.style.padding = "2px";
                    fileName.style.color = "#303030";
                    fileName.style.flex = "1";
                    fileName.style.fontSize = "14px";
                    fileName.style.fontWeight = "normal";
                    fileName.style.float = "left";
                    fileName.style.textAlign = "left";
                    fileName.style.margin = "auto";
                    label.appendChild(fileName);

                    var fileSize = document.createElement('label');
                    fileSize.innerHTML = formatFileSize(fileItem.size);
                    fileSize.style.padding = "2px";
                    fileSize.style.color = "#303030";
                    fileSize.style.width = "90px";
                    fileSize.style.fontSize = "14px";
                    fileSize.style.fontWeight = "normal";
                    fileSize.style.float = "right";
                    fileSize.style.textAlign = "right";
                    fileSize.style.margin = "auto";
                    label.appendChild(fileSize);
                });

                updateSelectAll();

                return true;
            }
        });
                        
        selectRecordingFilesDialog.showModal();
    }
}

function updateSelectAll()
{
    var checkedCount = 0;

    var checkboxes = document.getElementsByClassName(CLASS_NAME_RECORDING_FILES_SELECTION);

    for(i = 0; i < checkboxes.length; i++)
    {
        if(checkboxes[i].checked)
        {
            checkedCount++;
        }
    }

    console.log("updateSelectAll " + checkedCount);

    if (currentSensorToSelectRecordingFiles == undefined 
        || checkedCount != currentSensorToSelectRecordingFiles.fileList.length)
    {
        selectAllFilesButton.innerHTML = "Select All";
    }
    else
    {
        selectAllFilesButton.innerHTML = "UnSelect All";
    }
}

function onSelectAllFiles()
{
    var checkboxes = document.getElementsByClassName(CLASS_NAME_RECORDING_FILES_SELECTION);

    if (selectAllFilesButton.innerHTML == "Select All")
    {
        selectAllFilesButton.innerHTML = "UnSelect All";
        for(i = 0; i < checkboxes.length; i++)
        {
            checkboxes[i].checked = true;
        }
    }
    else if (selectAllFilesButton.innerHTML == "UnSelect All")
    {
        selectAllFilesButton.innerHTML = "Select All";

        for(i = 0; i<checkboxes.length; i++)
        {
            checkboxes[i].checked = false;
        }
    }
}

function cancelSelectRecordingFilesDialog()
{
    selectRecordingFilesDialog.close()
}

function confirmSelectRecordingFilesDialog()
{
    if (currentSensorToSelectRecordingFiles != undefined)
    {
        console.log("confirmSelectRecordingFiles for " + currentSensorToSelectRecordingFiles.port);

        var selectedFileList = [];
    
        var checkboxes = document.getElementsByClassName(CLASS_NAME_RECORDING_FILES_SELECTION);
        
        for(i = 0; i < checkboxes.length; i++)
        {
            var checkbox = checkboxes[i];

            if(checkbox.checked)
            {
                var index = checkbox.getAttribute("index");
                var fileName = checkbox.getAttribute("name");
                var size = checkbox.getAttribute("size");

                selectedFileList.push({index: parseInt(index), fileName: fileName, size: parseInt(size) });

                console.log("Select file: index " + index + ", fileName " + fileName + ", size " + size);
            }
        }

        discoveredSensors.some(function(sensor)
        {
            if (sensor.port == currentSensorToSelectRecordingFiles.port)
            {
                sensor.selectedFileList = selectedFileList;
                return true;
            }
        });

        var element = document.getElementById(ID_SELECT_FILE_TO_RECORDING_CHECKBOX + currentSensorToSelectRecordingFiles.port);
        element.disabled = false;

        if (selectedFileList.length == 0)
        {
            element.checked = false;
            element.disabled = true;
        }

        var selectRecordingFilesButton = document.getElementById(ID_SELECT_RECORDING_FILES_BUTTON + currentSensorToSelectRecordingFiles.port);

        if (selectRecordingFilesButton != undefined)
        {
            if (selectedFileList.length > 1)
            {
                selectRecordingFilesButton.innerHTML = selectedFileList.length + " Files Selected >";
            }
            else
            {
                selectRecordingFilesButton.innerHTML = selectedFileList.length + " File Selected >";
            }
        }
    }

    updateExportButton();

    selectRecordingFilesDialog.close()
}

function formatFileSize(size)
{
    if (size < 1024)
    {
        return size.toFixed(2) + " B";
    } else if (size < 1024 * 1024)
    {
        return (size / 1024).toFixed(2) + " KB";
    } else
    {
        return (size / (1024 * 1024)).toFixed(2) + " MB";
    }
}


// ---------------------------------------------------------------------------------------
// -- Handle EVENT_GUI --
// ---------------------------------------------------------------------------------------
socket.on(EVENT_GUI, function(eventName, parameters)
{
    if (typeof guiEventHandler === 'undefined')
    {
        console.log("WARNING 'guiEventHandler()' function not defined on page!");
    }
    else guiEventHandler(eventName, parameters);
});

// ---------------------------------------------------------------------------------------
// -- Emit EVENT_GUI with event name and parameters --
// ---------------------------------------------------------------------------------------
function sendGuiEvent(eventName, parameters)
{
    socket.emit(EVENT_GUI, eventName, parameters);
}
