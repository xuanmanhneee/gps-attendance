import { useEffect, useState } from 'react';
import { IoClose } from 'react-icons/io5';

import type { UnitResponse } from '@gps-attendance/shared';

import { useTranslation } from '../../hooks/useTranslation';

export type UnitFormValues = {
  name: string;
  parentId: number | null;
};

type UnitFormModalProps = {
  isOpen: boolean;
  editingUnit: UnitResponse | null;
  units: UnitResponse[];
  forbiddenParentIds: Set<number>;
  isSubmitting: boolean;
  formError: string | null;
  onClose: () => void;
  onSubmit: (values: UnitFormValues) => void;
};

export const UnitFormModal = ({
  isOpen,
  editingUnit,
  units,
  forbiddenParentIds,
  isSubmitting,
  formError,
  onClose,
  onSubmit,
}: UnitFormModalProps) => {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [parentId, setParentId] = useState<number | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setName(editingUnit?.name ?? '');
      setParentId(editingUnit?.parentId ?? null);
      setValidationError(null);
    }
  }, [isOpen, editingUnit]);

  if (!isOpen) return null;

  const parentOptions = units.filter(
    (unit) => !forbiddenParentIds.has(unit.id),
  );

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (name.trim().length === 0) {
      setValidationError(t('units.nameRequired'));
      return;
    }
    setValidationError(null);
    onSubmit({ name: name.trim(), parentId });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={editingUnit ? t('units.edit') : t('units.create')}
      className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-xl border border-line bg-surface shadow-panel"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="font-display text-[15px] font-bold text-ink">
            {editingUnit ? t('units.edit') : t('units.create')}
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label={t('units.cancel')}
            className="grid h-7 w-7 place-items-center rounded-lg text-muted transition-colors hover:bg-surface-subtle hover:text-ink disabled:opacity-50"
          >
            <IoClose aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-5 py-4">
          <label className="flex flex-col gap-1.5 text-[12px] font-bold text-ink">
            {t('units.name')}
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={t('units.namePlaceholder')}
              disabled={isSubmitting}
              className="rounded-lg border border-line bg-surface px-3 py-2 text-[13px] font-normal text-ink outline-none transition focus:border-accent-strong disabled:opacity-60"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-[12px] font-bold text-ink">
            {t('units.parent')}
            <select
              value={parentId === null ? '' : String(parentId)}
              onChange={(event) =>
                setParentId(
                  event.target.value === '' ? null : Number(event.target.value),
                )
              }
              disabled={isSubmitting}
              className="rounded-lg border border-line bg-surface px-3 py-2 text-[13px] font-normal text-ink outline-none transition focus:border-accent-strong disabled:opacity-60"
            >
              <option value="">{t('units.root')}</option>
              {parentOptions.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.name}
                </option>
              ))}
            </select>
          </label>

          {(validationError ?? formError) && (
            <p role="alert" className="text-[12px] font-bold text-danger">
              {validationError ?? formError}
            </p>
          )}

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-lg border border-line bg-surface-subtle px-4 py-2 text-[12px] font-bold text-ink transition-colors hover:border-accent-strong hover:text-accent-strong disabled:opacity-50"
            >
              {t('units.cancel')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-lg border border-accent-strong bg-accent-strong px-4 py-2 text-[12px] font-bold text-white transition-opacity disabled:opacity-50"
            >
              {isSubmitting
                ? editingUnit
                  ? t('units.saving')
                  : t('units.creating')
                : t('units.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
