import React from 'react';
import TrashIcon from 'part:@sanity/base/trash-icon'
import * as ConfirmDeleteModule from '@sanity/desk-tool/lib/components/ConfirmDelete';
import { IResolverProps, IUseDocumentOperationResult } from '../types';
import { getConfig, getSanityClient, getBaseIdFromId, getTranslationsFor } from '../utils';
import { useDocumentOperation } from '@sanity/react-hooks';
import { useToast } from '@sanity/ui';

/**
 * This code is mostly taken from the defualt DeleteAction provided by Sanity
 */

const DISABLED_REASON_TITLE = {
  NOTHING_TO_DELETE: "This document doesn't yet exist or is already deleted"
}

export const DeleteWithi18nAction = ({ id, type, draft, published, onComplete }: IResolverProps) => {
  const toast = useToast();
  const ConfirmDelete = React.useMemo(() => (
    ConfirmDeleteModule?.ConfirmDelete ?? ConfirmDeleteModule?.default
  ), [ConfirmDeleteModule]);
  const config = React.useMemo(() => getConfig(type), [type]);
  const baseDocumentId = React.useMemo(() => getBaseIdFromId(id), [id]);
  const { delete: deleteOp } = useDocumentOperation(id, type) as IUseDocumentOperationResult;
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [isConfirmDialogOpen, setConfirmDialogOpen] = React.useState(false);

  const onHandle = React.useCallback(() => {
    setConfirmDialogOpen(true);
  }, []);

  const onDialogCancel = React.useCallback(() => {
    setConfirmDialogOpen(false);
    if (onComplete) onComplete();
  }, [onComplete]);

  const onDialogConfirm = React.useCallback(async () => {
    try {
      setIsDeleting(true);
      setConfirmDialogOpen(false);
      const client = getSanityClient();
      deleteOp.execute();
      const translatedDocuments = await getTranslationsFor(baseDocumentId);
      const transaction = client.transaction();
      translatedDocuments.forEach(doc => transaction.delete(doc._id));
      await transaction.commit();
      if (onComplete) onComplete();
    } catch (err) {
      toast.push({
        closable: true,
        status: 'error',
        title: err.toString(),
      });
    }
  }, [baseDocumentId, deleteOp, onComplete]);

  const dialogContent = React.useMemo(() => {
    if (isConfirmDialogOpen) {
      return (
        <ConfirmDelete
          draft={draft}
          published={published}
          onCancel={onDialogCancel}
          onConfirm={onDialogConfirm}
        />
      )
    }

    return null;
  }, [isConfirmDialogOpen, draft, published, onDialogCancel, onDialogConfirm]);

  return {
    onHandle,
    color: 'danger',
    icon: TrashIcon,
    disabled: isDeleting || Boolean(deleteOp.disabled),
    title: (deleteOp.disabled && DISABLED_REASON_TITLE[deleteOp.disabled]) || '',
    label: isDeleting ? config.messages?.deleteAll?.deleting : config.messages?.deleteAll?.buttonTitle,
    dialog: isConfirmDialogOpen && {
      type: 'legacy',
      onClose: onComplete,
      title: 'Delete',
      content: dialogContent
    }
  }
}