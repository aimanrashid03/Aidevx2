import { useState, useCallback, createElement } from 'react';
import ConfirmDialog from '../components/ConfirmDialog';

interface ConfirmOptions {
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: 'danger' | 'default';
}

interface NotifyOptions {
    message: string;
    variant?: 'error' | 'success';
    duration?: number;
}

interface DialogState {
    open: boolean;
    options: ConfirmOptions;
    resolve: ((value: boolean) => void) | null;
}

interface NotifyState {
    visible: boolean;
    message: string;
    variant: 'error' | 'success';
}

export function useConfirmDialog() {
    const [dialogState, setDialogState] = useState<DialogState>({
        open: false,
        options: { title: '', message: '' },
        resolve: null,
    });

    const [notifyState, setNotifyState] = useState<NotifyState>({
        visible: false,
        message: '',
        variant: 'error',
    });

    const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
        return new Promise<boolean>((resolve) => {
            setDialogState({ open: true, options, resolve });
        });
    }, []);

    const handleConfirm = useCallback(() => {
        dialogState.resolve?.(true);
        setDialogState(prev => ({ ...prev, open: false, resolve: null }));
    }, [dialogState.resolve]);

    const handleCancel = useCallback(() => {
        dialogState.resolve?.(false);
        setDialogState(prev => ({ ...prev, open: false, resolve: null }));
    }, [dialogState.resolve]);

    const notify = useCallback((options: NotifyOptions) => {
        setNotifyState({ visible: true, message: options.message, variant: options.variant || 'error' });
        setTimeout(() => {
            setNotifyState(prev => ({ ...prev, visible: false }));
        }, options.duration || 3000);
    }, []);

    const dialog = createElement(ConfirmDialog, {
        open: dialogState.open,
        title: dialogState.options.title,
        message: dialogState.options.message,
        confirmLabel: dialogState.options.confirmLabel,
        cancelLabel: dialogState.options.cancelLabel,
        variant: dialogState.options.variant,
        onConfirm: handleConfirm,
        onCancel: handleCancel,
    });

    const notificationBanner = notifyState.visible
        ? createElement('div', {
            className: `fixed top-4 right-4 z-[70] px-4 py-2.5 rounded-lg shadow-lg border text-xs font-bold animate-in fade-in slide-in-from-top duration-200 ${
                notifyState.variant === 'error'
                    ? 'bg-red-50 text-red-700 border-red-200'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
            }`,
        }, notifyState.message)
        : null;

    return { dialog, notificationBanner, confirm, notify };
}
