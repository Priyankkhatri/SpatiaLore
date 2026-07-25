import React, { useState } from 'react';
import { generateScriptApi, saveScriptToSupabase } from '../../lib/scriptsApi';

export default function ScriptGenerationPanel({
  poi,
  cityName = 'Jaipur, India',
  currentScript = null,
  onScriptSaved,
  onClose,
}) {
  const [content, setContent] = useState(currentScript?.content || '');
  const [llmProvider, setLlmProvider] = useState(currentScript?.llm_provider || null);
  const [llmModel, setLlmModel] = useState(currentScript?.llm_model || null);
  const [generationPrompt, setGenerationPrompt] = useState(currentScript?.generation_prompt || '');
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  // Parse City and Country from cityName string (e.g. "Jaipur, India")
  const cityParts = cityName.split(',').map((s) => s.trim());
  const city = cityParts[0] || 'Jaipur';
  const country = cityParts[1] || 'India';

  const handleGenerate = async () => {
    setGenerating(true);
    setErrorMsg(null);

    const { data, error } = await generateScriptApi({
      poiName: poi.name,
      category: poi.category || 'landmark',
      city,
      country,
    });

    if (error) {
      setErrorMsg(error.message || 'Script generation failed.');
      setGenerating(false);
    } else if (data) {
      setContent(data.content);
      setLlmProvider(data.llmProvider);
      setLlmModel(data.llmModel);
      setGenerationPrompt(data.generationPrompt);
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!content.trim()) return;

    setSaving(true);
    setErrorMsg(null);

    const { data, error } = await saveScriptToSupabase({
      poiId: poi.id,
      languageCode: 'en',
      content: content.trim(),
      llmProvider: llmProvider || 'manual-edit',
      llmModel: llmModel || 'none',
      generationPrompt: generationPrompt || `Manual narration edit for ${poi.name}`,
    });

    if (error) {
      setErrorMsg(error.message || 'Failed to save script to database.');
      setSaving(false);
    } else if (data) {
      setSaving(false);
      onScriptSaved(data);
    }
  };

  const wordCount = content.trim().split(/\s+/).filter(Boolean).length;

  return (
    <div className="modal-overlay">
      <div className="script-panel-card">
        <div className="panel-header">
          <h3>Narration Script — {poi.name}</h3>
          <button className="btn-close" onClick={onClose} disabled={generating || saving}>
            &times;
          </button>
        </div>

        {errorMsg && (
          <div className="error-banner">
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="poi-summary-box">
          <div className="meta-item">
            <label>POI Category</label>
            <span className="badge-category">{poi.category || 'landmark'}</span>
          </div>
          <div className="meta-item">
            <label>Location</label>
            <span className="text-muted">{city}, {country}</span>
          </div>
        </div>

        {generating ? (
          <div className="generating-status-card">
            <div className="loading-spinner"></div>
            <p className="generating-title">Generating Narration Script...</p>
            <p className="generating-subtext">
              Generating narration — this may take up to 30-40 seconds if we need to fall back to a backup model.
            </p>
          </div>
        ) : (
          <div className="script-editor-container">
            <div className="script-header-row">
              <label htmlFor="script-text">Audio Narration Script (Text-To-Speech Payload)</label>
              
              <div className="script-badges-row">
                {wordCount > 0 && (
                  <span className="badge-wordcount">{wordCount} words</span>
                )}

                {llmProvider === 'self-hosted' && (
                  <span className="badge-provider provider-primary" title={`Model: ${llmModel}`}>
                    Generated via: Self-Hosted Model
                  </span>
                )}

                {llmProvider === 'groq-fallback' && (
                  <span className="badge-provider provider-fallback" title={`Model: ${llmModel}`}>
                    ⚠️ Generated via: Groq (Fallback)
                  </span>
                )}
              </div>
            </div>

            <textarea
              id="script-text"
              className="script-textarea"
              rows={8}
              placeholder="Click 'Generate Script' to produce AI narration text using LLM..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              disabled={saving}
            />

            <div className="panel-actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={handleGenerate}
                disabled={generating || saving}
              >
                {content ? '🔄 Regenerate Script' : '✨ Generate Script'}
              </button>

              <button
                type="button"
                className="btn-primary"
                onClick={handleSave}
                disabled={!content.trim() || generating || saving}
              >
                {saving ? 'Saving...' : 'Save Script to Database'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
