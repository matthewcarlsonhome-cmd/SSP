/**
 * ClientImportExportPanel - UI for bulk import and export of clients
 *
 * Features:
 * - CSV file upload with drag & drop
 * - Field mapping preview
 * - Import progress and results
 * - Export options (CSV/JSON)
 */

import React, { useState, useCallback, useRef } from 'react';
import {
  Upload,
  Download,
  FileText,
  FileJson,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  Table,
  Users,
  Zap,
  GitBranch,
  FileUp,
  ArrowRight,
} from 'lucide-react';
import { Button } from './ui/Button';
import { cn } from '../lib/theme';
import {
  importFromCSV,
  downloadCSV,
  downloadJSON,
  type ImportResult,
  type ExportOptions,
} from '../lib/clientImportExport';
import type { Client } from '../lib/storage/types';

interface ClientImportExportPanelProps {
  clients: Client[];
  onImport: (clients: Partial<Client>[]) => Promise<void>;
  className?: string;
}

export const ClientImportExportPanel: React.FC<ClientImportExportPanelProps> = ({
  clients,
  onImport,
  className,
}) => {
  // Import state
  const [isDragging, setIsDragging] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Export state
  const [showExportOptions, setShowExportOptions] = useState(false);
  const [exportOptions, setExportOptions] = useState<Partial<ExportOptions>>({
    includeContacts: true,
    includeSkills: true,
    includeWorkflows: true,
    includeNotes: false,
  });

  // Handle file drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith('.csv')) {
      processFile(file);
    }
  }, []);

  // Handle file input change
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  }, []);

  // Process uploaded file
  const processFile = async (file: File) => {
    setIsImporting(true);
    setImportResult(null);

    try {
      const text = await file.text();
      const result = importFromCSV(text, {
        autoDetectIndustry: true,
        autoAssignSkills: true,
      });
      setImportResult(result);
    } catch (error) {
      console.error('Import failed:', error);
      setImportResult({
        success: false,
        imported: 0,
        skipped: 0,
        errors: [{ row: 0, error: 'Failed to read file' }],
        clients: [],
      });
    } finally {
      setIsImporting(false);
    }
  };

  // Save imported clients
  const handleSaveImport = async () => {
    if (!importResult?.clients.length) return;

    setIsSaving(true);
    try {
      await onImport(importResult.clients);
      // Clear import result after successful save
      setImportResult(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Save failed:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle export
  const handleExport = (format: 'csv' | 'json') => {
    if (format === 'csv') {
      downloadCSV(clients, undefined, exportOptions);
    } else {
      downloadJSON(clients, undefined, exportOptions);
    }
    setShowExportOptions(false);
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Table className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Import / Export Clients</h3>
        </div>
      </div>

      {/* Import Section */}
      <div className="rounded-lg border bg-card p-4 space-y-4">
        <h4 className="font-medium flex items-center gap-2">
          <Upload className="h-4 w-4" />
          Import from CSV
        </h4>

        {/* Drop Zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
            isDragging ? 'border-primary bg-primary/5' : 'border-muted hover:border-muted-foreground',
          )}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileSelect}
            className="hidden"
          />
          <FileUp className={cn(
            'h-10 w-10 mx-auto mb-3',
            isDragging ? 'text-primary' : 'text-muted-foreground'
          )} />
          <p className="text-sm font-medium mb-1">
            {isDragging ? 'Drop CSV file here' : 'Click to upload or drag and drop'}
          </p>
          <p className="text-xs text-muted-foreground">
            CSV file with company data (company name, industry, contacts, etc.)
          </p>
        </div>

        {/* Loading */}
        {isImporting && (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
            <span>Processing CSV...</span>
          </div>
        )}

        {/* Import Result */}
        {importResult && (
          <div className="space-y-4">
            {/* Summary */}
            <div className={cn(
              'rounded-lg p-4',
              importResult.success ? 'bg-green-500/10' : 'bg-yellow-500/10'
            )}>
              <div className="flex items-center gap-2 mb-2">
                {importResult.success ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-yellow-600" />
                )}
                <span className="font-medium">
                  {importResult.success ? 'Import Ready' : 'Partial Import'}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Parsed:</span>
                  <span className="ml-2 font-medium">{importResult.imported}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Skipped:</span>
                  <span className="ml-2 font-medium">{importResult.skipped}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Errors:</span>
                  <span className="ml-2 font-medium text-red-600">{importResult.errors.length}</span>
                </div>
              </div>
            </div>

            {/* Errors */}
            {importResult.errors.length > 0 && (
              <div className="rounded-lg border border-red-200 bg-red-500/5 p-3">
                <h5 className="text-sm font-medium text-red-600 mb-2">Errors</h5>
                <ul className="text-xs space-y-1 max-h-24 overflow-y-auto">
                  {importResult.errors.map((err, i) => (
                    <li key={i} className="text-red-600">
                      Row {err.row}: {err.error}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Preview */}
            {importResult.clients.length > 0 && (
              <div>
                <h5 className="text-sm font-medium mb-2">Preview ({importResult.clients.length} companies)</h5>
                <div className="rounded-lg border max-h-48 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 sticky top-0">
                      <tr>
                        <th className="text-left p-2">Company</th>
                        <th className="text-left p-2">Industry</th>
                        <th className="text-left p-2">Contacts</th>
                        <th className="text-left p-2">Skills</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importResult.clients.slice(0, 10).map((client, i) => (
                        <tr key={i} className="border-t">
                          <td className="p-2 font-medium">{client.companyName}</td>
                          <td className="p-2 text-muted-foreground">
                            {client.industry?.replace(/_/g, ' ')}
                          </td>
                          <td className="p-2">
                            <span className="inline-flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {client.contacts?.length || 0}
                            </span>
                          </td>
                          <td className="p-2">
                            <span className="inline-flex items-center gap-1">
                              <Zap className="h-3 w-3" />
                              {client.selectedSkillIds?.length || 0}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {importResult.clients.length > 10 && (
                    <div className="text-center text-xs text-muted-foreground py-2 border-t">
                      +{importResult.clients.length - 10} more companies
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setImportResult(null);
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
              >
                <X className="h-4 w-4 mr-1" />
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSaveImport}
                disabled={isSaving || !importResult.clients.length}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <ArrowRight className="h-4 w-4 mr-1" />
                    Import {importResult.clients.length} Companies
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Export Section */}
      <div className="rounded-lg border bg-card p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-medium flex items-center gap-2">
            <Download className="h-4 w-4" />
            Export Clients
          </h4>
          <span className="text-sm text-muted-foreground">{clients.length} clients</span>
        </div>

        {!showExportOptions ? (
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => setShowExportOptions(true)}
            >
              <FileText className="h-4 w-4 mr-2" />
              Export as CSV
            </Button>
            <Button
              variant="outline"
              onClick={() => downloadJSON(clients)}
            >
              <FileJson className="h-4 w-4 mr-2" />
              Export as JSON
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Export Options */}
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={exportOptions.includeContacts}
                  onChange={e => setExportOptions(prev => ({ ...prev, includeContacts: e.target.checked }))}
                  className="rounded"
                />
                <span className="text-sm">Include contacts</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={exportOptions.includeSkills}
                  onChange={e => setExportOptions(prev => ({ ...prev, includeSkills: e.target.checked }))}
                  className="rounded"
                />
                <span className="text-sm">Include selected skills</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={exportOptions.includeWorkflows}
                  onChange={e => setExportOptions(prev => ({ ...prev, includeWorkflows: e.target.checked }))}
                  className="rounded"
                />
                <span className="text-sm">Include selected workflows</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={exportOptions.includeNotes}
                  onChange={e => setExportOptions(prev => ({ ...prev, includeNotes: e.target.checked }))}
                  className="rounded"
                />
                <span className="text-sm">Include notes & technical info</span>
              </label>
            </div>

            {/* Export Buttons */}
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowExportOptions(false)}
              >
                Cancel
              </Button>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExport('csv')}
                >
                  <FileText className="h-4 w-4 mr-1" />
                  Download CSV
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleExport('json')}
                >
                  <FileJson className="h-4 w-4 mr-1" />
                  Download JSON
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Template Download */}
      <div className="text-center text-sm text-muted-foreground">
        <p>
          Need a template?{' '}
          <button
            onClick={() => {
              const template = 'Company Name,Industry,Website,Description,Contact Name,Contact Title,Contact Email,Contact LinkedIn\nAcme Corp,technology,https://acme.com,Software development company,John Doe,CEO,john@acme.com,https://linkedin.com/in/johndoe';
              const blob = new Blob([template], { type: 'text/csv' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'client_import_template.csv';
              a.click();
              URL.revokeObjectURL(url);
            }}
            className="text-primary hover:underline"
          >
            Download CSV template
          </button>
        </p>
      </div>
    </div>
  );
};

export default ClientImportExportPanel;
