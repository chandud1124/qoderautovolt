// GPIO Pin Utilities for ESP32 and ESP8266 Device Management
// Provides validation, safety checks, and recommendations for GPIO pin usage

// ESP32 GPIO pin classifications
const ESP32_PROBLEMATIC_PINS = new Set([4, 5, 12, 13, 14, 15]);
const ESP32_RESERVED_PINS = new Set([6, 7, 8, 9, 10, 11]);
const ESP32_SAFE_PINS = Array.from({ length: 40 }, (_, i) => i).filter(p => !ESP32_PROBLEMATIC_PINS.has(p) && !ESP32_RESERVED_PINS.has(p));

// ESP8266 GPIO pin classifications (17 pins: 0-16)
const ESP8266_PROBLEMATIC_PINS = new Set([0, 2, 15]); // These have special boot functions
const ESP8266_RESERVED_PINS = new Set([]); // ESP8266 has no reserved pins like ESP32
const ESP8266_SAFE_PINS = Array.from({ length: 17 }, (_, i) => i).filter(p => !ESP8266_PROBLEMATIC_PINS.has(p));

// Pin purpose recommendations for ESP32
const ESP32_RECOMMENDED_PINS = {
  relay: {
    primary: [16, 17, 18, 19, 21, 22], // Best for relay control
    secondary: [23, 25, 26, 27, 32, 33], // Alternative relay pins
    description: 'GPIO pins 16-19, 21-23, 25-27, 32-33 are recommended for relay control'
  },
  manual: {
    primary: [23, 25, 26, 27, 32, 33], // Best for manual switches
    secondary: [16, 17, 18, 19, 21, 22], // Alternative manual pins
    description: 'GPIO pins 23, 25-27, 32-33 are recommended for manual switches'
  },
  pir: {
    primary: [34, 35, 36, 39], // Input-only pins (best for PIR)
    secondary: [16, 17, 18, 19, 21, 22, 23, 25, 26, 27, 32, 33], // Alternative PIR pins
    description: 'GPIO pins 34-36, 39 are recommended for PIR sensors (input-only)'
  }
};

// Pin purpose recommendations for ESP8266
const ESP8266_RECOMMENDED_PINS = {
  relay: {
    primary: [4, 5, 12, 14], // Most stable for relay control (avoid GPIO13,16 for relays)
    secondary: [13, 16], // Alternative relay pins if needed
    description: 'GPIO pins 4, 5, 12, 14 are most stable for relay control on ESP8266'
  },
  manual: {
    primary: [13, 1, 3], // Safe pins for manual switches (GPIO13, TX, RX)
    secondary: [0, 2, 15, 16], // Problematic pins as fallback (with warnings)
    description: 'GPIO pins 13, 1, 3 are safest for manual switches; 0, 2, 15, 16 available with caution'
  },
  pir: {
    primary: [4, 5, 12, 13, 14, 16], // Safe pins for PIR sensors
    secondary: [0, 2, 15], // Problematic pins as fallback
    description: 'GPIO pins 4, 5, 12, 13, 14, 16 are recommended for PIR sensors'
  }
};

/**
 * Validate if a GPIO pin is safe to use
 * @param {number} pin - GPIO pin number
 * @param {boolean} allowProblematic - Allow problematic pins (default: false)
 * @param {string} deviceType - Device type ('esp32' or 'esp8266', default: 'esp32')
 * @returns {boolean} - True if pin is valid and safe
 */
function validateGpioPin(pin, allowProblematic = false, deviceType = 'esp32') {
  if (typeof pin !== 'number') {
    return false;
  }

  const maxPin = deviceType === 'esp8266' ? 16 : 39;
  if (pin < 0 || pin > maxPin) {
    return false;
  }

  let problematicPins, reservedPins;

  if (deviceType === 'esp8266') {
    problematicPins = ESP8266_PROBLEMATIC_PINS;
    reservedPins = ESP8266_RESERVED_PINS;
  } else {
    problematicPins = ESP32_PROBLEMATIC_PINS;
    reservedPins = ESP32_RESERVED_PINS;
  }

  // Always reject reserved pins
  if (reservedPins.has(pin)) {
    return false;
  }

  // For problematic pins, only allow if explicitly permitted
  if (problematicPins.has(pin) && !allowProblematic) {
    return false;
  }

  return true;
}

/**
 * Get detailed status information for a GPIO pin
 * @param {number} pin - GPIO pin number
 * @param {string} deviceType - Device type ('esp32' or 'esp8266', default: 'esp32')
 * @returns {object} - Pin status information
 */
function getGpioPinStatus(pin, deviceType = 'esp32') {
  if (typeof pin !== 'number') {
    return {
      safe: false,
      status: 'invalid',
      reason: 'Invalid GPIO pin number',
      category: 'invalid'
    };
  }

  const maxPin = deviceType === 'esp8266' ? 16 : 39;
  if (pin < 0 || pin > maxPin) {
    return {
      safe: false,
      status: 'invalid',
      reason: `Invalid GPIO pin number (must be 0-${maxPin})`,
      category: 'invalid'
    };
  }

  let problematicPins, reservedPins, safePins, recommendedPins;

  if (deviceType === 'esp8266') {
    problematicPins = ESP8266_PROBLEMATIC_PINS;
    reservedPins = ESP8266_RESERVED_PINS;
    safePins = ESP8266_SAFE_PINS;
    recommendedPins = ESP8266_RECOMMENDED_PINS;
  } else {
    problematicPins = ESP32_PROBLEMATIC_PINS;
    reservedPins = ESP32_RESERVED_PINS;
    safePins = ESP32_SAFE_PINS;
    recommendedPins = ESP32_RECOMMENDED_PINS;
  }

  if (reservedPins.has(pin)) {
    return {
      safe: false,
      status: 'reserved',
      reason: deviceType === 'esp8266' ? 'Reserved for ESP8266 internal use' : 'Reserved for internal ESP32 use (pins 6-11)',
      category: 'reserved',
      bootImpact: deviceType === 'esp32' ? 'Will prevent ESP32 from booting' : 'May affect ESP8266 operation'
    };
  }

  if (problematicPins.has(pin)) {
    return {
      safe: false,
      status: 'problematic',
      reason: deviceType === 'esp8266' ?
        'May interfere with ESP8266 boot or flash operations (GPIO 0, 2, 15)' :
        'May cause ESP32 boot issues (pins 4, 5, 12-15)',
      category: 'problematic',
      bootImpact: deviceType === 'esp8266' ?
        'May prevent proper booting or affect serial communication' :
        'May cause boot loops or prevent booting',
      alternativePins: getRecommendedPins('relay', 'primary', deviceType)
    };
  }

  if (safePins.includes(pin)) {
    const isInputOnly = deviceType === 'esp32' && pin >= 34 && pin <= 39;
    return {
      safe: true,
      status: 'safe',
      reason: `Safe for ${deviceType.toUpperCase()} boot and operation`,
      category: 'safe',
      inputOnly: isInputOnly,
      recommendedFor: getRecommendedUses(pin, deviceType)
    };
  }

  return {
    safe: false,
    status: 'unknown',
    reason: 'Unknown GPIO pin status',
    category: 'unknown'
  };
}

/**
 * Get recommended uses for a safe GPIO pin
 * @param {number} pin - GPIO pin number
 * @param {string} deviceType - Device type ('esp32' or 'esp8266', default: 'esp32')
 * @returns {string[]} - Array of recommended uses
 */
function getRecommendedUses(pin, deviceType = 'esp32') {
  const recommendedPins = deviceType === 'esp8266' ? ESP8266_RECOMMENDED_PINS : ESP32_RECOMMENDED_PINS;
  const uses = [];

  if (recommendedPins.relay.primary.includes(pin) || recommendedPins.relay.secondary.includes(pin)) {
    uses.push('relay');
  }

  if (recommendedPins.manual.primary.includes(pin) || recommendedPins.manual.secondary.includes(pin)) {
    uses.push('manual_switch');
  }

  if (recommendedPins.pir.primary.includes(pin) || recommendedPins.pir.secondary.includes(pin)) {
    uses.push('pir_sensor');
  }

  if (deviceType === 'esp32' && pin >= 34 && pin <= 39) {
    uses.push('input_only');
  }

  return uses;
}

/**
 * Get recommended pins for a specific purpose
 * @param {string} purpose - 'relay', 'manual', or 'pir'
 * @param {string} priority - 'primary' or 'secondary' (default: 'primary')
 * @param {string} deviceType - Device type ('esp32' or 'esp8266', default: 'esp32')
 * @returns {number[]} - Array of recommended GPIO pins
 */
function getRecommendedPins(purpose, priority = 'primary', deviceType = 'esp32') {
  const recommendedPins = deviceType === 'esp8266' ? ESP8266_RECOMMENDED_PINS : ESP32_RECOMMENDED_PINS;
  const recommendations = recommendedPins[purpose];
  if (!recommendations) {
    return [];
  }

  return recommendations[priority] || recommendations.primary || [];
}

/**
 * Validate a complete GPIO configuration
 * @param {object} config - Configuration object
 * @param {Array} config.switches - Array of switch configurations
 * @param {boolean} config.pirEnabled - Whether PIR is enabled
 * @param {number} config.pirGpio - PIR GPIO pin
 * @param {string} deviceType - Device type ('esp32' or 'esp8266', default: 'esp32')
 * @returns {object} - Validation result
 */
function validateGpioConfiguration(config, deviceType = 'esp32') {
  const { switches = [], pirEnabled = false, pirGpio } = config;
  const errors = [];
  const warnings = [];
  const usedPins = new Set();

  // Validate switches
  switches.forEach((sw, index) => {
    const switchNum = index + 1;

    // Check relay GPIO
    if (sw.gpio !== undefined) {
      if (usedPins.has(sw.gpio)) {
        errors.push({
          type: 'duplicate_pin',
          switch: switchNum,
          pin: sw.gpio,
          message: `GPIO ${sw.gpio} is already used by another component`
        });
      } else {
        usedPins.add(sw.gpio);
        const status = getGpioPinStatus(sw.gpio, deviceType);
        if (!status.safe) {
          if (status.status === 'problematic') {
            warnings.push({
              type: 'problematic_pin',
              switch: switchNum,
              pin: sw.gpio,
              message: status.reason,
              alternatives: getRecommendedPins('relay', 'primary', deviceType)
            });
          } else {
            errors.push({
              type: 'invalid_pin',
              switch: switchNum,
              pin: sw.gpio,
              message: status.reason
            });
          }
        }
      }
    }

    // Check manual switch GPIO
    if (sw.manualSwitchEnabled && sw.manualSwitchGpio !== undefined) {
      if (usedPins.has(sw.manualSwitchGpio)) {
        errors.push({
          type: 'duplicate_pin',
          switch: switchNum,
          pin: sw.manualSwitchGpio,
          message: `Manual GPIO ${sw.manualSwitchGpio} is already used by another component`
        });
      } else {
        usedPins.add(sw.manualSwitchGpio);
        const status = getGpioPinStatus(sw.manualSwitchGpio, deviceType);
        if (!status.safe) {
          if (status.status === 'problematic') {
            warnings.push({
              type: 'problematic_pin',
              switch: switchNum,
              pin: sw.manualSwitchGpio,
              message: `Manual switch: ${status.reason}`,
              alternatives: getRecommendedPins('manual', 'primary', deviceType)
            });
          } else {
            errors.push({
              type: 'invalid_pin',
              switch: switchNum,
              pin: sw.manualSwitchGpio,
              message: `Manual switch: ${status.reason}`
            });
          }
        }
      }
    }
  });

  // Validate PIR GPIO
  if (pirEnabled && pirGpio !== undefined) {
    if (usedPins.has(pirGpio)) {
      errors.push({
        type: 'duplicate_pin',
        pin: pirGpio,
        message: `PIR GPIO ${pirGpio} is already used by another component`
      });
    } else {
      const status = getGpioPinStatus(pirGpio, deviceType);
      if (!status.safe) {
        if (status.status === 'problematic') {
          warnings.push({
            type: 'problematic_pin',
            pin: pirGpio,
            message: `PIR sensor: ${status.reason}`,
            alternatives: getRecommendedPins('pir', 'primary', deviceType)
          });
        } else {
          errors.push({
            type: 'invalid_pin',
            pin: pirGpio,
            message: `PIR sensor: ${status.reason}`
          });
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    summary: {
      totalSwitches: switches.length,
      errors: errors.length,
      warnings: warnings.length,
      usedPins: Array.from(usedPins)
    }
  };
}

/**
 * Get all available pins for a device configuration
 * @param {string} deviceId - Device ID (optional)
 * @param {Array} existingConfig - Existing device configuration
 * @param {string} deviceType - Device type ('esp32' or 'esp8266', default: 'esp32')
 * @returns {object} - Available pins information
 */
function getAvailablePins(deviceId = null, existingConfig = [], deviceType = 'esp32') {
  const usedPins = new Set();

  // Mark existing pins as used
  existingConfig.forEach(item => {
    if (item.gpio !== undefined) usedPins.add(item.gpio);
    if (item.manualSwitchGpio !== undefined) usedPins.add(item.manualSwitchGpio);
    if (item.pirGpio !== undefined) usedPins.add(item.pirGpio);
  });

  const available = {
    relay: [],
    manual: [],
    pir: [],
    all: []
  };

  const safePins = deviceType === 'esp8266' ? ESP8266_SAFE_PINS : ESP32_SAFE_PINS;

  safePins.forEach(pin => {
    if (!usedPins.has(pin)) {
      available.all.push(pin);

      if (getRecommendedUses(pin, deviceType).includes('relay')) {
        available.relay.push(pin);
      }

      if (getRecommendedUses(pin, deviceType).includes('manual_switch')) {
        available.manual.push(pin);
      }

      if (getRecommendedUses(pin, deviceType).includes('pir_sensor')) {
        available.pir.push(pin);
      }
    }
  });

  return available;
}

module.exports = {
  validateGpioPin,
  getGpioPinStatus,
  getRecommendedUses,
  getRecommendedPins,
  validateGpioConfiguration,
  getAvailablePins
};