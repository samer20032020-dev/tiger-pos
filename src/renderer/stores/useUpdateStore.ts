import { create } from 'zustand';
import { UpdateCheckResult, UpdateProgressEvent } from '../../shared/types';
import { useAppStore } from './useAppStore';
import { useCartStore } from './useCartStore';
import { tigerConfirm } from './useConfirmStore';

export type AutoUpdateStatus =
  | 'idle'
  | 'checking'
  | 'up_to_date'
  | 'downloading'
  | 'ready'
  | 'error';

interface UpdateState {
  status: AutoUpdateStatus;
  updateInfo: UpdateCheckResult | null;
  progress: UpdateProgressEvent | null;
  downloadedFilePath: string | null;
  errorMessage: string | null;
  isBundleUpdate: boolean;
  progressUnsubscribed: boolean;

  initProgressListener: () => void;
  checkAndAutoDownload: (silent?: boolean) => Promise<void>;
  downloadManually: () => Promise<void>;
  applyAndRestart: () => Promise<void>;
}

let unsubProgressFn: (() => void) | null = null;
let autoCheckRunning = false;

export const useUpdateStore = create<UpdateState>((set, get) => ({
  status: 'idle',
  updateInfo: null,
  progress: null,
  downloadedFilePath: null,
  errorMessage: null,
  isBundleUpdate: true,
  progressUnsubscribed: false,

  initProgressListener: () => {
    if (unsubProgressFn || !window.tigerAPI?.onUpdateProgress) return;
    unsubProgressFn = window.tigerAPI.onUpdateProgress((evt) => {
      set({
        progress: evt,
        isBundleUpdate: evt.isBundle,
      });
    });
  },

  checkAndAutoDownload: async (silent = true) => {
    if (autoCheckRunning || !window.tigerAPI?.checkGithubUpdate) return;
    const curState = get();
    if (curState.status === 'downloading' || curState.status === 'ready') {
      return;
    }

    autoCheckRunning = true;
    get().initProgressListener();

    if (!silent) {
      set({ status: 'checking', errorMessage: null });
    }

    try {
      const info = await window.tigerAPI.checkGithubUpdate();
      set({ updateInfo: info });

      if (info.error && !info.hasUpdate) {
        set({ status: 'error', errorMessage: info.error });
        if (!silent) {
          useAppStore.getState().addToast(info.error, 'warning');
        }
        return;
      }

      if (!info.hasUpdate) {
        set({ status: 'up_to_date', errorMessage: null });
        if (!silent) {
          useAppStore.getState().addToast('أنت تستخدم أحدث إصدار من النظام حالياً ✅', 'success');
        }
        return;
      }

      // Update found! Automatically download fast bundle (or installer) in the background
      const preferredUrl = info.bundleDownloadUrl || info.downloadUrl || '';
      const isBundle = Boolean(info.bundleDownloadUrl);

      set({
        status: 'downloading',
        isBundleUpdate: isBundle,
        progress: {
          stage: 'downloading',
          percent: 0,
          downloadedBytes: 0,
          totalBytes: info.bundleSize || info.installerSize || 0,
          isBundle,
        },
        errorMessage: null,
      });

      const dlRes = await window.tigerAPI.downloadUpdate(preferredUrl, info.latestVersion);
      if (dlRes.success) {
        set({
          status: 'ready',
          downloadedFilePath: dlRes.filePath || null,
          isBundleUpdate: dlRes.isBundle ?? isBundle,
          progress: {
            stage: 'ready',
            percent: 100,
            downloadedBytes: info.bundleSize || info.installerSize || 0,
            totalBytes: info.bundleSize || info.installerSize || 0,
            isBundle: dlRes.isBundle ?? isBundle,
          },
        });
        useAppStore.getState().addToast(
          `✨ التحديث v${info.latestVersion} جاهز في الخلفية! اضغط لتحديث النظام فوراً`,
          'success'
        );
      } else {
        set({
          status: 'error',
          errorMessage: dlRes.error || 'تعذر تنزيل التحديث في الخلفية',
        });
        if (!silent) {
          useAppStore.getState().addToast(dlRes.error || 'فشل تنزيل التحديث', 'error');
        }
      }
    } catch (err: any) {
      const msg = err?.message || 'حدث خطأ أثناء فحص التحديثات';
      set({ status: 'error', errorMessage: msg });
      if (!silent) {
        useAppStore.getState().addToast(msg, 'error');
      }
    } finally {
      autoCheckRunning = false;
    }
  },

  downloadManually: async () => {
    const info = get().updateInfo;
    if (!info || !window.tigerAPI?.downloadUpdate) {
      await get().checkAndAutoDownload(false);
      return;
    }
    if (get().status === 'downloading') return;

    get().initProgressListener();
    const preferredUrl = info.bundleDownloadUrl || info.downloadUrl || '';
    const isBundle = Boolean(info.bundleDownloadUrl);

    set({
      status: 'downloading',
      isBundleUpdate: isBundle,
      progress: {
        stage: 'downloading',
        percent: 0,
        downloadedBytes: 0,
        totalBytes: info.bundleSize || info.installerSize || 0,
        isBundle,
      },
      errorMessage: null,
    });

    try {
      const dlRes = await window.tigerAPI.downloadUpdate(preferredUrl, info.latestVersion);
      if (dlRes.success) {
        set({
          status: 'ready',
          downloadedFilePath: dlRes.filePath || null,
          isBundleUpdate: dlRes.isBundle ?? isBundle,
        });
        useAppStore.getState().addToast(
          `✅ تم تجهيز التحديث v${info.latestVersion} بنجاح! اضغط لإعادة التشغيل وتطبيق التحديث`,
          'success'
        );
      } else {
        set({ status: 'error', errorMessage: dlRes.error || 'فشل تنزيل التحديث' });
        useAppStore.getState().addToast(dlRes.error || 'فشل تنزيل التحديث', 'error');
      }
    } catch (err: any) {
      set({ status: 'error', errorMessage: err?.message || 'فشل تنزيل التحديث' });
      useAppStore.getState().addToast(err?.message || 'فشل تنزيل التحديث', 'error');
    }
  },

  applyAndRestart: async () => {
    if (!window.tigerAPI?.installUpdateAndRestart) return;
    const cartItems = useCartStore.getState().items;
    if (cartItems.length > 0) {
      const ok = await tigerConfirm(
        'توجد أصناف مفتوحة في سلة المبيعات حالياً. هل تريد تطبيق التحديث وإعادة تشغيل البرنامج الآن؟',
        { title: 'تطبيق التحديث', confirmText: 'نعم، حدّث الآن', tone: 'warning' }
      );
      if (!ok) return;
    }

    const { downloadedFilePath, updateInfo } = get();
    useAppStore.getState().addToast('🔄 جاري تطبيق التحديث وإعادة التشغيل...', 'info');
    const res = await window.tigerAPI.installUpdateAndRestart(
      downloadedFilePath || undefined,
      updateInfo?.latestVersion
    );
    if (res && (res as any).success === false) {
      useAppStore.getState().addToast((res as any).error || 'تعذر بدء التحديث', 'error');
    }
  },
}));
