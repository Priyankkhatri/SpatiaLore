import React, { useState } from 'react';

export default function TourFormModal({ mode = 'create', initialValues = {}, onSave, onCancel }) {
  const [name, setName] = useState(initialValues.name || '');
  const [city, setCity] = useState(initialValues.city || '');
  const [country, setCountry] = useState(initialValues.country || '');
  const [supportedLanguages, setSupportedLanguages] = useState(
    initialValues.supported_languages || ['en']
  );
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const AVAILABLE_LANGUAGES = [
    { code: 'en', label: 'English' },
    { code: 'hi', label: 'Hindi (हिंदी)' },
    { code: 'fr', label: 'French (Français)' },
    { code: 'es', label: 'Spanish (Español)' },
    { code: 'de', label: 'German (Deutsch)' },
  ];

  const isFormInvalid = !name.trim() || !city.trim() || supportedLanguages.length === 0;

  const toggleLanguage = (code) => {
    setSupportedLanguages((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isFormInvalid || saving) return;

    setSaving(true);
    setErrorMsg(null);

    try {
      const { error } = await onSave({
        name: name.trim(),
        city: city.trim(),
        country: country.trim(),
        description: description.trim(),
        supported_languages: supportedLanguages,
      });

      if (error) {
        let msg = error.message || 'Failed to save tour. Please try again.';
        if (error.code === '42501' || msg.includes('row-level security')) {
          msg = 'Action failed — check that your account has an admin profile (see Phase 0.2 setup).';
        }
        setErrorMsg(msg);
        setSaving(false);
      }
    } catch (err) {
      setErrorMsg(err.message || 'An unexpected error occurred.');
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="tour-form-modal-card">
        <div className="panel-header">
          <h3>{mode === 'create' ? 'Create New Audio Tour' : 'Edit Tour Metadata'}</h3>
          <button className="btn-close" onClick={onCancel} disabled={saving}>
            &times;
          </button>
        </div>

        {errorMsg && (
          <div className="error-banner">
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="tour-form">
          <div className="form-group">
            <label htmlFor="tour-name">Tour Name *</label>
            <input
              id="tour-name"
              type="text"
              placeholder="e.g. Jaipur Heritage Walk"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={saving}
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="tour-city">City *</label>
              <input
                id="tour-city"
                type="text"
                placeholder="e.g. Jaipur"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                disabled={saving}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="tour-country">Country</label>
              <input
                id="tour-country"
                type="text"
                placeholder="e.g. India"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                disabled={saving}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="tour-description">Description</label>
            <textarea
              id="tour-description"
              rows={3}
              placeholder="Provide a brief summary of what travelers will experience on this audio tour..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={saving}
            />
          </div>

          <div className="form-group">
            <label>Supported Languages *</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginTop: '6px' }}>
              {AVAILABLE_LANGUAGES.map((lang) => (
                <label
                  key={lang.code}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '14px',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={supportedLanguages.includes(lang.code)}
                    onChange={() => toggleLanguage(lang.code)}
                    disabled={saving}
                  />
                  {lang.label}
                </label>
              ))}
            </div>
          </div>

          {isFormInvalid && (
            <p className="validation-help-text">
              * Tour Name, City, and at least 1 Supported Language are required.
            </p>
          )}

          <div className="panel-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={onCancel}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={isFormInvalid || saving}
            >
              {saving ? 'Saving...' : mode === 'create' ? 'Create Tour' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
