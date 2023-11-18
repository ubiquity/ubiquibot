const fs = require('fs');
const yaml = require('js-yaml');

const CONFIG_FILE_PATH = 'config.yml';

function readConfig() {
  try {
    const fileContents = fs.readFileSync(CONFIG_FILE_PATH, 'utf8');
    return yaml.safeLoad(fileContents);
  } catch (error) {
    console.error('Error reading configuration file:', error);
    return {};
  }
}

function writeConfig(config) {
  try {
    const yamlString = yaml.dump(config, { noRefs: true });
    fs.writeFileSync(CONFIG_FILE_PATH, yamlString, 'utf8');
  } catch (error) {
    console.error('Error writing to configuration file:', error);
  }
}

function modifyConfig(command, value) {
  const config = readConfig();

  if (command === 'disable' && config.hasOwnProperty('start_command')) {
    config.start_command = null;
  } else if (command === 'set' && config.hasOwnProperty('max_users')) {
    config.max_users = value;
  } else if (command === 'toggle' && config.hasOwnProperty('enable_feature_x')) {
    config.enable_feature_x = !config.enable_feature_x;
  }

  writeConfig(config);
}

// Command line arguments
const [,, command, value] = process.argv;

if (!command) {
  console.error('Usage: node script.js <command> [value]');
  process.exit(1);
}

modifyConfig(command, value);
console.log('Configuration updated successfully.');
