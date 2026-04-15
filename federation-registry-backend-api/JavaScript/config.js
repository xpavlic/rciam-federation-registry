const config = require('./config.json');

const localizedFieldSuffix = (config.localized_field_suffix || 'localized').trim();
const localizedLanguage = (config.localized_language || localizedFieldSuffix || 'localized').trim();

const replaceLocalizedField = (fieldName) => {
  if (!fieldName.endsWith('_localized')) {
    return fieldName;
  }

  return `${fieldName.slice(0, -'localized'.length)}${localizedFieldSuffix}`;
};

if (Array.isArray(config.service_fields)) {
  config.service_fields = config.service_fields.map(replaceLocalizedField);
}

if (Array.isArray(config.deployment_fields)) {
  config.deployment_fields = config.deployment_fields.map(replaceLocalizedField);
}

config.localized_field_suffix = localizedFieldSuffix;
config.localized_language = localizedLanguage;
config.localized_service_fields = {
  service_name: `service_name_${localizedFieldSuffix}`,
  service_description: `service_description_${localizedFieldSuffix}`,
  service_login_url: `service_login_url_${localizedFieldSuffix}`,
};
config.localized_policy_fields = {
  url: `url_${localizedFieldSuffix}`,
};

module.exports = config;