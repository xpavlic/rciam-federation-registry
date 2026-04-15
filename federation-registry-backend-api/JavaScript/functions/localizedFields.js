var config = require('../config');

const DEFAULT_SUFFIX = 'localized';
const DEFAULT_LANGUAGE = 'localized';

const getLocalizedSuffix = () => (config.localized_field_suffix || DEFAULT_SUFFIX).trim();
const getLocalizedLanguage = () => (config.localized_language || DEFAULT_LANGUAGE).trim();

const getLocalizedColumns = () => ({
  service_name: (config.localized_service_fields && config.localized_service_fields.service_name) || `service_name_${getLocalizedSuffix()}`,
  service_description: (config.localized_service_fields && config.localized_service_fields.service_description) || `service_description_${getLocalizedSuffix()}`,
  service_login_url: (config.localized_service_fields && config.localized_service_fields.service_login_url) || `service_login_url_${getLocalizedSuffix()}`,
});

const getLocalizedPolicyUrlField = () => {
  if (config.localized_policy_fields && config.localized_policy_fields.url) {
    return config.localized_policy_fields.url;
  }
  return `url_${getLocalizedSuffix()}`;
};

const withLocalizedAliases = (input) => {
  if (!input || typeof input !== 'object') {
    return input;
  }

  const output = input;
  const localizedColumns = getLocalizedColumns();

  const alias = (legacyName, localizedName) => {
    if (output[localizedName] === undefined && output[legacyName] !== undefined) {
      output[localizedName] = output[legacyName];
    }
    if (output[legacyName] === undefined && output[localizedName] !== undefined) {
      output[legacyName] = output[localizedName];
    }
  };

  alias('service_name_localized', localizedColumns.service_name);
  alias('service_description_localized', localizedColumns.service_description);
  alias('service_login_url_localized', localizedColumns.service_login_url);

  return output;
};

const extractLocalizedPayload = (input) => {
  if (!input || typeof input !== 'object') {
    return null;
  }

  const localizedColumns = getLocalizedColumns();
  const normalized = withLocalizedAliases(input);
  const payload = {
    service_name: normalized[localizedColumns.service_name],
    service_description: normalized[localizedColumns.service_description],
    service_login_url: normalized[localizedColumns.service_login_url],
  };

  if (payload.service_name === undefined && payload.service_description === undefined && payload.service_login_url === undefined) {
    return null;
  }

  return payload;
};

const withLocalizedPolicyAliases = (input) => {
  if (!input || typeof input !== 'object') {
    return input;
  }

  const output = input;
  const localizedPolicyUrlField = getLocalizedPolicyUrlField();
  const legacyPolicyUrlField = 'url_localized';

  if (output[localizedPolicyUrlField] === undefined && output[legacyPolicyUrlField] !== undefined) {
    output[localizedPolicyUrlField] = output[legacyPolicyUrlField];
  }
  if (output[legacyPolicyUrlField] === undefined && output[localizedPolicyUrlField] !== undefined) {
    output[legacyPolicyUrlField] = output[localizedPolicyUrlField];
  }

  if (output[localizedPolicyUrlField] === undefined && output.url !== undefined) {
    output[localizedPolicyUrlField] = output.url;
  }

  return output;
};

module.exports = {
  getLocalizedColumns,
  getLocalizedLanguage,
  getLocalizedPolicyUrlField,
  withLocalizedAliases,
  withLocalizedPolicyAliases,
  extractLocalizedPayload,
};