import React, { useState } from 'react';
import Form from 'react-bootstrap/Form';
import Button from 'react-bootstrap/Button';
import InputGroup from 'react-bootstrap/InputGroup';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Alert from 'react-bootstrap/Alert';
import { useTranslation } from 'react-i18next';
import InputRow from './InputRow';
import { SimpleInput, SimpleCheckbox } from './Inputs';

const IdpRestrictionList = ({ title, values, onRemove, disabled }) => {
  if (!Array.isArray(values) || values.length === 0) {
    return null;
  }

  return (
    <div className="mb-2">
      <strong>{title}</strong>
      <div className="d-flex flex-wrap mt-1">
        {values.map((item, index) => (
          <span
            key={`${item}-${index}`}
            className="badge bg-secondary me-2 mb-2"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
          >
            {item}
            <button
              type="button"
              className="btn btn-sm btn-light"
              onClick={() => onRemove(index)}
              style={{ lineHeight: 1, padding: '2px 6px' }}
              disabled={disabled}
              aria-label="Remove IdP restriction"
            >
              <span aria-hidden="true">x</span>
              <span className="visually-hidden">Remove IdP restriction</span>
            </button>
          </span>
        ))}
      </div>
    </div>
  );
};

const AccessControlTab = ({ values, errors, touched, setFieldValue, handleChange, handleBlur, disabled, hasSubmitted }) => {
  const { t } = useTranslation();
  const [idpEntry, setIdpEntry] = useState('');
  const [idpMode, setIdpMode] = useState('none');

  const handleAddIdpRestriction = () => {
    const trimmed = idpEntry.trim();
    if (!trimmed || idpMode === 'none') {
      return;
    }

    const fieldName = idpMode === 'block' ? 'rp_blocked_idps_desc' : 'rp_only_allowed_idps_desc';
    const currentValues = Array.isArray(values[fieldName]) ? values[fieldName] : [];

    if (!currentValues.includes(trimmed)) {
      setFieldValue(fieldName, [...currentValues, trimmed], true);
    }
    setIdpEntry('');
  };

  const removeIdpRestriction = (fieldName, indexToRemove) => {
    const currentValues = Array.isArray(values[fieldName]) ? values[fieldName] : [];
    setFieldValue(
      fieldName,
      currentValues.filter((_, index) => index !== indexToRemove),
      true
    );
  };

  return (
    <React.Fragment>
      <InputRow
        title={t('access_control_idp_restrictions_title')}
        description={t('access_control_idp_restrictions_desc')}
        touched={true}
      >
        <InputGroup>
          <Form.Control
            type="text"
            value={idpEntry}
            onChange={(event) => setIdpEntry(event.target.value)}
            onBlur={handleBlur}
            disabled={disabled}
          />
          <Form.Control
            as="select"
            value={idpMode}
            onChange={(event) => setIdpMode(event.target.value)}
            disabled={disabled}
            style={{ maxWidth: '190px' }}
          >
            <option value="none">{t('access_control_none')}</option>
            <option value="block">{t('access_control_block_list')}</option>
            <option value="allow">{t('access_control_allow_list')}</option>
          </Form.Control>
          <InputGroup.Append>
            <Button
              variant="outline-primary"
              disabled={disabled || !idpEntry.trim() || idpMode === 'none'}
              onClick={handleAddIdpRestriction}
            >
              {t('input_add_button')}
            </Button>
          </InputGroup.Append>
        </InputGroup>
        <Form.Text className="text-muted text-left">
          Block list: urn:perun:facility:attribute-def:def:rpBlockedidpsDesc | Allow list: urn:perun:facility:attribute-def:def:rpOnlyAllowedIdpsDesc
        </Form.Text>
        <IdpRestrictionList
          title={t('access_control_blocked_idps')}
          values={values.rp_blocked_idps_desc}
          onRemove={(index) => removeIdpRestriction('rp_blocked_idps_desc', index)}
          disabled={disabled}
        />
        <IdpRestrictionList
          title={t('access_control_allowed_idps')}
          values={values.rp_only_allowed_idps_desc}
          onRemove={(index) => removeIdpRestriction('rp_only_allowed_idps_desc', index)}
          disabled={disabled}
        />
      </InputRow>

      <InputRow
        title={t('access_control_restrict_by_membership_title')}
        touched={touched.check_group_membership}
        error={errors.check_group_membership}
      >
        <SimpleCheckbox
          name='check_group_membership'
          label={t('access_control_restrict_by_membership_label')}
          onChange={handleChange}
          onBlur={handleBlur}
          checked={values.check_group_membership}
          value={values.check_group_membership}
          disabled={disabled}
        />
        <Form.Text className="text-muted text-left">
          urn:perun:facility:attribute-def:def:checkGroupMembership
        </Form.Text>
      </InputRow>

      {values.check_group_membership ? (
        <React.Fragment>
          <InputRow title={t('access_control_vo_membership_title')} touched={touched.require_vo_membership || touched.rp_ensure_membership_desc} error={errors.rp_ensure_membership_desc}>
            <SimpleCheckbox
              name='require_vo_membership'
              label={t('access_control_vo_membership_label')}
              onChange={handleChange}
              onBlur={handleBlur}
              checked={values.require_vo_membership}
              value={values.require_vo_membership}
              disabled={disabled}
            />
            <SimpleInput
              name='rp_ensure_membership_desc'
              placeholder={t('access_control_vo_short_name_placeholder')}
              onChange={handleChange}
              onBlur={handleBlur}
              value={values.rp_ensure_membership_desc || ''}
              disabled={disabled || !values.require_vo_membership}
              isInvalid={hasSubmitted ? !!errors.rp_ensure_membership_desc : (!!errors.rp_ensure_membership_desc && touched.rp_ensure_membership_desc)}
            />
            <Form.Text className="text-muted text-left">
              urn:perun:facility:attribute-def:def:rpEnsureMembershipDesc
            </Form.Text>
          </InputRow>

          <InputRow title={t('access_control_group_membership_title')} touched={touched.require_group_membership || touched.rp_ensure_group_membership_desc} error={errors.rp_ensure_group_membership_desc}>
            <SimpleCheckbox
              name='require_group_membership'
              label={t('access_control_group_membership_label')}
              onChange={handleChange}
              onBlur={handleBlur}
              checked={values.require_group_membership}
              value={values.require_group_membership}
              disabled={disabled}
            />
            <SimpleInput
              name='rp_ensure_group_membership_desc'
              placeholder={t('access_control_group_name_placeholder')}
              onChange={handleChange}
              onBlur={handleBlur}
              value={values.rp_ensure_group_membership_desc || ''}
              disabled={disabled || !values.require_group_membership}
              isInvalid={hasSubmitted ? !!errors.rp_ensure_group_membership_desc : (!!errors.rp_ensure_group_membership_desc && touched.rp_ensure_group_membership_desc)}
            />

            <SimpleCheckbox
              name='create_group'
              label={t('access_control_create_group_label')}
              onChange={handleChange}
              onBlur={handleBlur}
              checked={values.create_group}
              value={values.create_group}
              disabled={disabled}
            />
          </InputRow>

          {values.create_group ? (
            <InputRow title={t('access_control_group_enrollment_title')} touched={true}>
              <Row>
                <Col>
                  <Form.Check
                    type='radio'
                    name='allow_registration_option'
                    label={t('access_control_manual_assignment')}
                    checked={!values.allow_registration}
                    onChange={() => setFieldValue('allow_registration', false, true)}
                    disabled={disabled}
                  />
                  <Form.Check
                    type='radio'
                    name='allow_registration_option'
                    label={t('access_control_auto_enrollment')}
                    checked={!!values.allow_registration}
                    onChange={() => setFieldValue('allow_registration', true, true)}
                    disabled={disabled}
                  />
                </Col>
              </Row>
              <Form.Text className="text-muted text-left">
                urn:perun:facility:attribute-def:def:allowRegistration
              </Form.Text>
            </InputRow>
          ) : null}
        </React.Fragment>
      ) : null}

      <InputRow title={t('access_control_registration_handling_title')} touched={touched.dynamic_registration || touched.registration_url} error={errors.registration_url}>
        <SimpleCheckbox
          name='dynamic_registration'
          label={t('access_control_delegate_to_aai')}
          onChange={handleChange}
          onBlur={handleBlur}
          checked={values.dynamic_registration}
          value={values.dynamic_registration}
          disabled={disabled}
        />
        <Form.Text className="text-muted text-left">
          urn:perun:facility:attribute-def:def:dynamicRegistration
        </Form.Text>
        <SimpleInput
          name='registration_url'
          placeholder='https://'
          onChange={handleChange}
          onBlur={handleBlur}
          value={values.registration_url || ''}
          disabled={disabled || !values.dynamic_registration}
          isInvalid={hasSubmitted ? !!errors.registration_url : (!!errors.registration_url && touched.registration_url)}
        />
        <Form.Text className="text-muted text-left">
          urn:perun:facility:attribute-def:def:registrationURL
        </Form.Text>
      </InputRow>

      {values.check_group_membership && !values.require_vo_membership && !values.require_group_membership ? (
        <Alert variant='warning'>{t('access_control_membership_warning')}</Alert>
      ) : null}
    </React.Fragment>
  );
};

export default AccessControlTab;
