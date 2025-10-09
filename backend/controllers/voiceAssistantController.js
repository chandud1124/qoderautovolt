const Device = require('../models/Device');
const { logger } = require('../middleware/logger');

// Google Assistant Smart Home Handlers
async function handleGoogleAssistantRequest(inputs, requestId) {
  const responses = [];

  for (const input of inputs) {
    const { intent } = input;

    switch (intent) {
      case 'action.devices.SYNC':
        responses.push(await handleGoogleSync(requestId));
        break;

      case 'action.devices.QUERY':
        responses.push(await handleGoogleQuery(input.payload, requestId));
        break;

      case 'action.devices.EXECUTE':
        responses.push(await handleGoogleExecute(input.payload, requestId));
        break;

      default:
        responses.push({
          requestId,
          payload: {
            errorCode: 'PROTOCOL_ERROR',
            debugString: `Unsupported intent: ${intent}`
          }
        });
    }
  }

  return {
    requestId,
    payload: {
      commands: responses
    }
  };
}

async function handleGoogleSync(requestId) {
  try {
    // Get all devices for sync
    const devices = await Device.find({ status: 'online' });

    const deviceConfigs = devices.flatMap(device =>
      device.switches.map(switchInfo => ({
        id: `${device._id}_${switchInfo._id}`,
        type: getGoogleDeviceType(switchInfo.type),
        traits: ['action.devices.traits.OnOff'],
        name: {
          name: `${device.name} ${switchInfo.name}`,
          defaultNames: [`${device.location} ${switchInfo.name}`],
          nicknames: [`${device.classroom} ${switchInfo.name}`]
        },
        deviceInfo: {
          manufacturer: 'AutoVolt IoT',
          model: device.deviceType,
          hwVersion: '1.0',
          swVersion: '1.0'
        },
        attributes: {},
        willReportState: true
      }))
    );

    return {
      ids: deviceConfigs.map(d => d.id),
      status: 'SUCCESS',
      states: {}
    };
  } catch (error) {
    logger.error('[Google Assistant] Sync error:', error);
    return {
      requestId,
      payload: {
        errorCode: 'DEVICE_NOT_FOUND',
        debugString: error.message
      }
    };
  }
}

async function handleGoogleQuery(payload, requestId) {
  try {
    const { devices: deviceQueries } = payload;
    const deviceStates = {};

    for (const deviceQuery of deviceQueries) {
      const [deviceId, switchId] = deviceQuery.id.split('_');
      const device = await Device.findById(deviceId);

      if (device) {
        const switchData = device.switches.id(switchId);
        if (switchData) {
          deviceStates[deviceQuery.id] = {
            online: device.status === 'online',
            on: switchData.state
          };
        }
      }
    }

    return {
      status: 'SUCCESS',
      states: deviceStates
    };
  } catch (error) {
    logger.error('[Google Assistant] Query error:', error);
    return {
      requestId,
      payload: {
        errorCode: 'DEVICE_NOT_FOUND',
        debugString: error.message
      }
    };
  }
}

async function handleGoogleExecute(payload, requestId) {
  try {
    const { commands } = payload;
    const commandResults = [];

    for (const command of commands) {
      const { execution } = command;

      for (const exec of execution) {
        if (exec.command === 'action.devices.commands.OnOff') {
          const { params } = exec;

          for (const deviceId of command.devices.ids) {
            const [devId, switchId] = deviceId.split('_');

            // Use existing toggleSwitch logic
            const result = await toggleDeviceSwitch(devId, switchId, params.on);

            commandResults.push({
              ids: [deviceId],
              status: result.success ? 'SUCCESS' : 'ERROR',
              states: {
                online: true,
                on: params.on
              }
            });
          }
        }
      }
    }

    return {
      commands: commandResults
    };
  } catch (error) {
    logger.error('[Google Assistant] Execute error:', error);
    return {
      requestId,
      payload: {
        errorCode: 'DEVICE_NOT_FOUND',
        debugString: error.message
      }
    };
  }
}

// Alexa Smart Home Handlers
async function handleAlexaRequest(directive) {
  const { header, endpoint, payload } = directive;
  const { namespace, name } = header;

  switch (namespace) {
    case 'Alexa.Discovery':
      return await handleAlexaDiscovery(header);

    case 'Alexa.PowerController':
      return await handleAlexaPowerControl(header, endpoint, payload);

    case 'Alexa':
      if (name === 'ReportState') {
        return await handleAlexaReportState(header, endpoint);
      }
      break;
  }

  return {
    event: {
      header: {
        namespace: 'Alexa',
        name: 'ErrorResponse',
        messageId: header.messageId,
        correlationToken: header.correlationToken,
        payloadVersion: '3'
      },
      endpoint: {
        endpointId: endpoint.endpointId
      },
      payload: {
        type: 'INVALID_DIRECTIVE',
        message: 'Unsupported directive'
      }
    }
  };
}

async function handleAlexaDiscovery(header) {
  try {
    const devices = await Device.find({ status: 'online' });

    const endpoints = devices.flatMap(device =>
      device.switches.map(switchInfo => ({
        endpointId: `${device._id}_${switchInfo._id}`,
        manufacturerName: 'AutoVolt IoT',
        friendlyName: `${device.name} ${switchInfo.name}`,
        description: `${device.location} ${switchInfo.name}`,
        displayCategories: ['SWITCH'],
        capabilities: [
          {
            type: 'AlexaInterface',
            interface: 'Alexa.PowerController',
            version: '3',
            properties: {
              supported: [{ name: 'powerState' }],
              proactivelyReported: true,
              retrievable: true
            }
          },
          {
            type: 'AlexaInterface',
            interface: 'Alexa.EndpointHealth',
            version: '3',
            properties: {
              supported: [{ name: 'connectivity' }],
              proactivelyReported: true,
              retrievable: true
            }
          }
        ]
      }))
    );

    return {
      event: {
        header: {
          namespace: 'Alexa.Discovery',
          name: 'Discover.Response',
          messageId: header.messageId,
          payloadVersion: '3'
        },
        payload: {
          endpoints
        }
      }
    };
  } catch (error) {
    logger.error('[Alexa] Discovery error:', error);
    return {
      event: {
        header: {
          namespace: 'Alexa',
          name: 'ErrorResponse',
          messageId: header.messageId,
          payloadVersion: '3'
        },
        payload: {
          type: 'INTERNAL_ERROR',
          message: error.message
        }
      }
    };
  }
}

async function handleAlexaPowerControl(header, endpoint, payload) {
  try {
    const [deviceId, switchId] = endpoint.endpointId.split('_');
    const newState = payload.powerState === 'ON';

    const result = await toggleDeviceSwitch(deviceId, switchId, newState);

    return {
      context: {
        properties: [
          {
            namespace: 'Alexa.PowerController',
            name: 'powerState',
            value: newState ? 'ON' : 'OFF',
            timeOfSample: new Date().toISOString(),
            uncertaintyInMilliseconds: 500
          },
          {
            namespace: 'Alexa.EndpointHealth',
            name: 'connectivity',
            value: {
              value: 'OK'
            },
            timeOfSample: new Date().toISOString(),
            uncertaintyInMilliseconds: 500
          }
        ]
      },
      event: {
        header: {
          namespace: 'Alexa',
          name: 'Response',
          messageId: header.messageId,
          correlationToken: header.correlationToken,
          payloadVersion: '3'
        },
        endpoint: {
          endpointId: endpoint.endpointId
        },
        payload: {}
      }
    };
  } catch (error) {
    logger.error('[Alexa] Power control error:', error);
    return {
      event: {
        header: {
          namespace: 'Alexa',
          name: 'ErrorResponse',
          messageId: header.messageId,
          correlationToken: header.correlationToken,
          payloadVersion: '3'
        },
        endpoint: {
          endpointId: endpoint.endpointId
        },
        payload: {
          type: 'INTERNAL_ERROR',
          message: error.message
        }
      }
    };
  }
}

async function handleAlexaReportState(header, endpoint) {
  try {
    const [deviceId, switchId] = endpoint.endpointId.split('_');
    const device = await Device.findById(deviceId);

    if (!device) {
      throw new Error('Device not found');
    }

    const switchData = device.switches.id(switchId);
    if (!switchData) {
      throw new Error('Switch not found');
    }

    return {
      context: {
        properties: [
          {
            namespace: 'Alexa.PowerController',
            name: 'powerState',
            value: switchData.state ? 'ON' : 'OFF',
            timeOfSample: new Date().toISOString(),
            uncertaintyInMilliseconds: 500
          },
          {
            namespace: 'Alexa.EndpointHealth',
            name: 'connectivity',
            value: {
              value: device.status === 'online' ? 'OK' : 'UNREACHABLE'
            },
            timeOfSample: new Date().toISOString(),
            uncertaintyInMilliseconds: 500
          }
        ]
      },
      event: {
        header: {
          namespace: 'Alexa',
          name: 'StateReport',
          messageId: header.messageId,
          correlationToken: header.correlationToken,
          payloadVersion: '3'
        },
        endpoint: {
          endpointId: endpoint.endpointId
        },
        payload: {}
      }
    };
  } catch (error) {
    logger.error('[Alexa] Report state error:', error);
    return {
      event: {
        header: {
          namespace: 'Alexa',
          name: 'ErrorResponse',
          messageId: header.messageId,
          correlationToken: header.correlationToken,
          payloadVersion: '3'
        },
        endpoint: {
          endpointId: endpoint.endpointId
        },
        payload: {
          type: 'INTERNAL_ERROR',
          message: error.message
        }
      }
    };
  }
}

// Siri/HomeKit Handlers
async function handleSiriRequest(intent, deviceId, command, parameters) {
  try {
    switch (intent) {
      case 'turn_on':
      case 'turn_off':
        const [devId, switchId] = deviceId.split('_');
        const state = intent === 'turn_on';
        const result = await toggleDeviceSwitch(devId, switchId, state);
        return {
          success: result.success,
          state: state,
          deviceId,
          message: result.message
        };

      case 'get_status':
        const device = await Device.findById(deviceId);
        if (!device) {
          return { success: false, error: 'Device not found' };
        }

        return {
          success: true,
          online: device.status === 'online',
          switches: device.switches.map(sw => ({
            id: sw._id,
            name: sw.name,
            state: sw.state
          }))
        };

      default:
        return { success: false, error: 'Unsupported intent' };
    }
  } catch (error) {
    logger.error('[Siri] Request error:', error);
    return { success: false, error: error.message };
  }
}

// Voice Command Processing
async function processVoiceCommand(command, deviceName, switchName, user) {
  try {
    // Parse natural language command
    const commandLower = command.toLowerCase();

    // Determine action
    let action = null;
    if (commandLower.includes('turn on') || commandLower.includes('switch on') || commandLower.includes('on')) {
      action = true;
    } else if (commandLower.includes('turn off') || commandLower.includes('switch off') || commandLower.includes('off')) {
      action = false;
    } else if (commandLower.includes('status') || commandLower.includes('state')) {
      action = 'status';
    }

    if (action === null) {
      return { success: false, message: 'Could not understand the command. Try "turn on/off [device] [switch]"' };
    }

    // Find device
    const deviceQuery = deviceName ? {
      name: { $regex: deviceName, $options: 'i' }
    } : {};

    const device = await Device.findOne(deviceQuery);
    if (!device) {
      return { success: false, message: `Device "${deviceName}" not found` };
    }

    // Handle status request
    if (action === 'status') {
      const switchStates = device.switches.map(sw => `${sw.name}: ${sw.state ? 'ON' : 'OFF'}`).join(', ');
      return {
        success: true,
        message: `${device.name} is ${device.status === 'online' ? 'online' : 'offline'}. Switches: ${switchStates}`
      };
    }

    // Find switch
    let targetSwitch = null;
    if (switchName) {
      targetSwitch = device.switches.find(sw => sw.name.toLowerCase().includes(switchName.toLowerCase()));
    } else if (device.switches.length === 1) {
      targetSwitch = device.switches[0];
    }

    if (!targetSwitch) {
      const switchNames = device.switches.map(sw => sw.name).join(', ');
      return { success: false, message: `Switch "${switchName}" not found. Available switches: ${switchNames}` };
    }

    // Execute action
    const result = await toggleDeviceSwitch(device._id, targetSwitch._id, action);

    return {
      success: result.success,
      message: result.success
        ? `${targetSwitch.name} turned ${action ? 'ON' : 'OFF'}`
        : `Failed to control ${targetSwitch.name}: ${result.message}`
    };

  } catch (error) {
    logger.error('[Voice Command] Processing error:', error);
    return { success: false, message: 'An error occurred processing your command' };
  }
}

// Helper Functions
async function toggleDeviceSwitch(deviceId, switchId, state) {
  try {
    const device = await Device.findById(deviceId);
    if (!device) {
      return { success: false, message: 'Device not found' };
    }

    const switchIndex = device.switches.findIndex(sw => sw._id.toString() === switchId);
    if (switchIndex === -1) {
      return { success: false, message: 'Switch not found' };
    }

    // Update database
    const updated = await Device.findOneAndUpdate(
      { _id: deviceId, 'switches._id': switchId },
      { $set: { 'switches.$.state': state, 'switches.$.lastStateChange': new Date() } },
      { new: true }
    );

    if (!updated) {
      return { success: false, message: 'Failed to update switch' };
    }

    // Send MQTT command if device is online
    if (device.status === 'online' && global.sendMqttSwitchCommand) {
      const gpio = updated.switches[switchIndex].relayGpio || updated.switches[switchIndex].gpio;
      global.sendMqttSwitchCommand(updated.macAddress, gpio, state);
    }

    return { success: true, message: 'Switch updated successfully' };

  } catch (error) {
    logger.error('[Device Switch] Toggle error:', error);
    return { success: false, message: error.message };
  }
}

function getGoogleDeviceType(switchType) {
  const typeMap = {
    'light': 'action.devices.types.LIGHT',
    'fan': 'action.devices.types.FAN',
    'outlet': 'action.devices.types.OUTLET',
    'projector': 'action.devices.types.SWITCH',
    'ac': 'action.devices.types.AC_UNIT'
  };
  return typeMap[switchType] || 'action.devices.types.SWITCH';
}

function formatDevicesForGoogle(devices) {
  return devices.flatMap(device =>
    device.switches.map(switchInfo => ({
      id: `${device._id}_${switchInfo._id}`,
      type: getGoogleDeviceType(switchInfo.type),
      traits: ['action.devices.traits.OnOff'],
      name: {
        name: `${device.name} ${switchInfo.name}`,
        defaultNames: [`${device.location} ${switchInfo.name}`],
        nicknames: [`${device.classroom} ${switchInfo.name}`]
      },
      deviceInfo: {
        manufacturer: 'AutoVolt IoT',
        model: device.deviceType,
        hwVersion: '1.0',
        swVersion: '1.0'
      }
    }))
  );
}

function formatDevicesForAlexa(devices) {
  return devices.flatMap(device =>
    device.switches.map(switchInfo => ({
      endpointId: `${device._id}_${switchInfo._id}`,
      manufacturerName: 'AutoVolt IoT',
      friendlyName: `${device.name} ${switchInfo.name}`,
      description: `${device.location} ${switchInfo.name}`,
      displayCategories: ['SWITCH'],
      capabilities: [
        {
          type: 'AlexaInterface',
          interface: 'Alexa.PowerController',
          version: '3'
        }
      ]
    }))
  );
}

function formatDevicesForSiri(devices) {
  return devices.map(device => ({
    id: device._id,
    name: device.name,
    location: device.location,
    classroom: device.classroom,
    switches: device.switches.map(switchInfo => ({
      id: switchInfo._id,
      name: switchInfo.name,
      type: switchInfo.type
    }))
  }));
}

module.exports = {
  handleGoogleAssistantRequest,
  handleAlexaRequest,
  handleSiriRequest,
  processVoiceCommand
};