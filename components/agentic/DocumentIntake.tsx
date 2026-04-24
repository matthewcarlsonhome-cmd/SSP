/**
 * DocumentIntake — drop zone + extracted-fields preview.
 *
 * User pastes a Monday morning email dump (or any combined context). On
 * "Extract" the lib/agentic/intake module runs an extraction call and
 * populates each declared field. User reviews extracted values, can edit
 * any of them, then submits.
 *
 * The component is controlled: parent supplies the field specs and receives
 * the extracted values via onExtracted. The actual run-trigger lives on the
 * parent so this component stays focused on intake.
 */

import React from 'react';
import { FileText, Sparkles, Loader2, ClipboardPaste } from 'lucide-react';
import { extractIntake, type IntakeFieldSpec, type IntakeResult } from '../../lib/agentic/intake';
import type { AgenticProvider } from '../../lib/agentic';
import { Button } from '../ui/Button';
import { Card, CardDescription, CardHeader, CardTitle } from '../ui/Card';

interface DocumentIntakeProps {
  fields: IntakeFieldSpec[];
  provider: AgenticProvider;
  apiKey: string;
  onExtracted: (values: Record<string, string>) => void;
}

const DocumentIntake: React.FC<DocumentIntakeProps> = ({ fields, provider, apiKey, onExtracted }) => {
  const [document, setDocument] = React.useState('');
  const [result, setResult] = React.useState<IntakeResult | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [editedValues, setEditedValues] = React.useState<Record<string, string>>({});

  const handleExtract = async () => {
    if (!apiKey || !document.trim()) return;
    setLoading(true);
    try {
      const r = await extractIntake({ document, fields, provider, apiKey });
      setResult(r);
      setEditedValues(r.fields);
    } finally {
      setLoading(false);
    }
  };

  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) setDocument(text);
    } catch {
      // permissions or non-secure context — silently ignore
    }
  };

  const handleApply = () => {
    onExtracted(editedValues);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Document intake
        </CardTitle>
        <CardDescription>
          Paste raw context (Monday email dump, alert exports, Slack threads). The extractor
          pulls structured field values you can review before running.
        </CardDescription>
      </CardHeader>

      <div className="mt-3 space-y-3">
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-medium text-muted-foreground">
              Raw document ({document.length} chars)
            </label>
            <button
              type="button"
              onClick={handlePasteFromClipboard}
              className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
            >
              <ClipboardPaste className="h-3 w-3" />
              Paste from clipboard
            </button>
          </div>
          <textarea
            className="w-full text-sm p-2 rounded border bg-background font-mono"
            rows={8}
            placeholder="Paste anything here — alert emails, Looker exports, Slack threads, calendar entries…"
            value={document}
            onChange={(e) => setDocument(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={handleExtract}
            disabled={!apiKey || !document.trim() || loading}
            size="sm"
            variant="default"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4 mr-1" />
            )}
            {loading ? 'Extracting…' : 'Extract fields'}
          </Button>
          {!apiKey && (
            <span className="text-xs text-muted-foreground">Set provider key first.</span>
          )}
        </div>

        {result && (
          <div className="space-y-3 pt-3 border-t">
            {result.warnings.length > 0 && (
              <div className="text-xs p-2 rounded bg-amber-500/10 text-amber-700 border border-amber-500/30">
                {result.warnings.join(' ')}
              </div>
            )}
            <div className="text-xs text-muted-foreground">
              {fields.length - result.unmatched.length} of {fields.length} fields populated.
              Edit any value before applying.
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              {fields.map((f) => {
                const filled = !result.unmatched.includes(f.id);
                return (
                  <label key={f.id} className="block">
                    <span className="text-xs font-medium block mb-0.5">
                      {f.label}{' '}
                      {filled ? (
                        <span className="text-emerald-600">●</span>
                      ) : (
                        <span className="text-muted-foreground">○</span>
                      )}
                    </span>
                    <textarea
                      className="w-full text-sm p-2 rounded border bg-background"
                      rows={f.format === 'list' ? 3 : 2}
                      value={editedValues[f.id] ?? ''}
                      onChange={(e) =>
                        setEditedValues((prev) => ({ ...prev, [f.id]: e.target.value }))
                      }
                    />
                  </label>
                );
              })}
            </div>
            <Button onClick={handleApply} variant="success" size="sm">
              Apply extracted values to runner inputs
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
};

export default DocumentIntake;
