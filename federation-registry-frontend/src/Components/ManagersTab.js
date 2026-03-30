import React, { useState } from 'react';
import Button from 'react-bootstrap/Button';
import Modal from 'react-bootstrap/Modal';
import Form from 'react-bootstrap/Form';
import Alert from 'react-bootstrap/Alert';
import { useTranslation } from 'react-i18next';
import config from '../config.json';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ManagersTab = ({ tenantName, serviceId, serviceName, groupId, disabled }) => {
  const { t } = useTranslation();
  const [showModal, setShowModal] = useState(false);
  const [entry, setEntry] = useState('');
  const [emails, setEmails] = useState([]);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);

  const addEmail = () => {
    const candidate = entry.trim().toLowerCase();
    if (!candidate) {
      return;
    }
    if (!emailRegex.test(candidate) || emails.includes(candidate)) {
      return;
    }
    setEmails([...emails, candidate]);
    setEntry('');
  };

  const removeEmail = (email) => {
    setEmails(emails.filter((item) => item !== email));
  };

  const sendInvites = async () => {
    if (!groupId || emails.length === 0) {
      return;
    }

    setSending(true);
    setResult(null);

    try {
      const responses = await Promise.all(
        emails.map((email) =>
          fetch(config.host[tenantName] + 'tenants/' + tenantName + '/groups/' + groupId + '/invitations', {
            method: 'POST',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, group_manager: true, group_id: groupId })
          })
        )
      );

      const success = responses.every((response) => response.status === 200);
      setResult({ success, sent: emails.length });
      if (success) {
        setEmails([]);
      }
    } catch (error) {
      setResult({ success: false, sent: 0 });
    }

    setSending(false);
  };

  return (
    <React.Fragment>
      <div className='mb-3'>
        <Button
          variant='outline-primary'
          disabled={disabled || !serviceId}
          onClick={() => setShowModal(true)}
        >
          {t('managers_invite_button')}
        </Button>
      </div>

      <Modal show={showModal} onHide={() => setShowModal(false)} size='lg'>
        <Modal.Header closeButton>
          <Modal.Title>{t('managers_modal_title')} #{serviceId || t('managers_na')}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <h5>{serviceName || t('managers_service_name_fallback')}</h5>
          <p>{t('managers_modal_description')}</p>

          <Form.Control
            type='text'
            value={entry}
            onChange={(event) => setEntry(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                addEmail();
              }
            }}
            placeholder=''
            disabled={sending}
          />

          <div className='d-flex flex-wrap mt-3'>
            {emails.map((email) => (
              <span
                key={email}
                className='badge bg-secondary me-2 mb-2'
                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
              >
                {email}
                <button
                  type='button'
                  className='btn btn-sm btn-light'
                  onClick={() => removeEmail(email)}
                  style={{ lineHeight: 1, padding: '2px 6px' }}
                >
                  x
                </button>
              </span>
            ))}
          </div>

          {!groupId ? (
            <Alert variant='warning' className='mt-3'>
              {t('managers_group_id_missing')}
            </Alert>
          ) : null}

          {result ? (
            <Alert variant={result.success ? 'success' : 'danger'} className='mt-3'>
              {result.success ? `${t('managers_send_completed')} (${result.sent})` : t('managers_send_failed')}
            </Alert>
          ) : null}
        </Modal.Body>
        <Modal.Footer>
          <Button variant='secondary' onClick={() => setShowModal(false)} disabled={sending}>{t('modal_close')}</Button>
          <Button
            variant='primary'
            onClick={sendInvites}
            disabled={sending || emails.length === 0 || !groupId}
          >
            {t('managers_send_invites')}
          </Button>
        </Modal.Footer>
      </Modal>
    </React.Fragment>
  );
};

export default ManagersTab;
