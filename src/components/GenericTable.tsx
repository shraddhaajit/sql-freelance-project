import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2, Search } from 'lucide-react';
import type { ColumnDef } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';

interface GenericTableProps {
  title: string;
  columns: ColumnDef[];
  data: any[];
  idKey: string;
  onAdd?: (item: any) => void;
  onUpdate?: (item: any) => void;
  onDelete?: (id: any) => void;
  customActions?: (row: any) => React.ReactNode;
  addButtonLabel?: string;
  readOnly?: boolean;
  defaultValues?: Record<string, any>;
}

function getStatusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  const s = status?.toLowerCase?.() || '';
  if (['accepted', 'completed', 'active', 'paid', 'resolved', 'closed'].includes(s)) return 'default';
  if (['pending', 'open', 'in progress', 'posted', 'processing'].includes(s)) return 'secondary';
  if (['rejected', 'cancelled', 'overdue', 'escalated'].includes(s)) return 'destructive';
  return 'outline';
}

const GenericTable: React.FC<GenericTableProps> = ({
  title, columns, data, idKey, onAdd, onUpdate, onDelete,
  customActions, addButtonLabel, readOnly = false, defaultValues,
}) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<any | null>(null);
  const [formValues, setFormValues] = useState<Record<string, any>>({});
  const [search, setSearch] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<any>(null);

  const formColumns = columns.filter(c => !c.hideInForm);

  const openAdd = () => {
    const initial: Record<string, any> = {};
    formColumns.forEach(c => {
      initial[c.key] = defaultValues?.[c.key] ?? (c.type === 'number' ? '' : '');
    });
    setFormValues(initial);
    setEditingRow(null);
    setDialogOpen(true);
  };

  const openEdit = (row: any) => {
    const vals: Record<string, any> = {};
    formColumns.forEach(c => {
      let val = row[c.key] ?? '';
      // Date inputs require exactly "YYYY-MM-DD" — strip any trailing time component
      if (c.type === 'date' && typeof val === 'string') {
        val = val.split(' ')[0].split('T')[0];
      }
      vals[c.key] = val;
    });
    vals[idKey] = row[idKey];
    setFormValues(vals);
    setEditingRow(row);
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    const processed = { ...formValues };
    columns.forEach(c => {
      if (c.type === 'number' && processed[c.key] !== undefined) {
        processed[c.key] = Number(processed[c.key]);
      }
    });
    if (editingRow) {
      onUpdate?.({ ...editingRow, ...processed });
    } else {
      onAdd?.(processed);
    }
    setDialogOpen(false);
  };

  const filteredData = data.filter(row =>
    !search || columns.some(c => String(row[c.key] ?? '').toLowerCase().includes(search.toLowerCase()))
  );

  const renderCellValue = (col: ColumnDef, row: any) => {
    const val = row[col.key];
    if (col.render) return col.render(val, row);
    if (col.key.toLowerCase().includes('status') && typeof val === 'string') {
      return <Badge variant={getStatusVariant(val)}>{val}</Badge>;
    }
    if (col.options) {
      const opt = col.options.find(o => String(o.value) === String(val));
      return opt?.label ?? val;
    }
    return val ?? '—';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="rounded-xl border bg-card shadow-sm overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-4 p-5 border-b bg-card">
        <h3 className="text-lg font-display font-semibold text-card-foreground">{title}</h3>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 w-48 h-9"
            />
          </div>
          {!readOnly && onAdd && (
            <Button onClick={openAdd} size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" />
              {addButtonLabel || 'Add'}
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto scrollbar-thin">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              {columns.map(col => (
                <TableHead key={col.key} className="font-medium text-muted-foreground" style={{ width: col.width }}>
                  {col.label}
                </TableHead>
              ))}
              {(!readOnly || customActions) && <TableHead className="w-32">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            <AnimatePresence mode="popLayout">
              {filteredData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length + 1} className="text-center py-12 text-muted-foreground">
                    No records found
                  </TableCell>
                </TableRow>
              ) : (
                filteredData.map((row, i) => (
                  <motion.tr
                    key={row[idKey] ?? i}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="border-b transition-colors hover:bg-muted/30"
                  >
                    {columns.map(col => (
                      <TableCell key={col.key} className="py-3">
                        {renderCellValue(col, row)}
                      </TableCell>
                    ))}
                    {(!readOnly || customActions) && (
                      <TableCell className="py-3">
                        <div className="flex items-center gap-1">
                          {customActions?.(row)}
                          {!readOnly && onUpdate && (
                            <Button variant="ghost" size="sm" onClick={() => openEdit(row)} className="h-8 w-8 p-0">
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {!readOnly && onDelete && (
                            <Button variant="ghost" size="sm" onClick={() => setDeleteConfirm(row[idKey])} className="h-8 w-8 p-0 text-destructive hover:text-destructive">
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    )}
                  </motion.tr>
                ))
              )}
            </AnimatePresence>
          </TableBody>
        </Table>
      </div>

      {/* Form Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display">{editingRow ? 'Edit' : 'Add'} {title.replace(/s$/, '')}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto">
            {formColumns.map(col => (
              <div key={col.key} className="grid gap-2">
                <Label htmlFor={col.key}>{col.label}</Label>
                {col.type === 'textarea' ? (
                  <Textarea
                    id={col.key}
                    value={formValues[col.key] ?? ''}
                    onChange={e => setFormValues(v => ({ ...v, [col.key]: e.target.value }))}
                    rows={3}
                  />
                ) : col.type === 'select' && col.options ? (
                  <select
                    id={col.key}
                    value={formValues[col.key] ?? ''}
                    onChange={e => setFormValues(v => ({ ...v, [col.key]: e.target.value }))}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="">Select...</option>
                    {col.options.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                ) : (
                  <Input
                    id={col.key}
                    type={col.type === 'date' ? 'date' : col.type === 'number' ? 'number' : 'text'}
                    value={formValues[col.key] ?? ''}
                    min={col.key === 'rating' ? 1 : undefined}
                    max={col.key === 'rating' ? 5 : undefined}
                    onChange={e => {
                      let val = e.target.value;
                      if (col.key === 'rating') {
                        const n = Math.min(5, Math.max(1, Number(val)));
                        val = String(isNaN(n) ? 1 : n);
                      }
                      setFormValues(v => ({ ...v, [col.key]: val }));
                    }}
                  />
                )}
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit}>{editingRow ? 'Update' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={deleteConfirm !== null} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display">Confirm Delete</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground">Are you sure you want to delete this record? This action cannot be undone.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => { onDelete?.(deleteConfirm); setDeleteConfirm(null); }}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
};

export default GenericTable;