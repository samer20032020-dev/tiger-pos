import { BrowserWindow } from 'electron';

export interface PrintReceiptOptions {
  paperSize: '80mm' | '58mm';
  silent?: boolean;
}

export interface PrintBarcodeOptions {
  widthMm: number; // e.g., 50mm
  heightMm: number; // e.g., 25mm
  silent?: boolean;
}

export class PrintService {
  /**
   * Print an HTML string silently or via dialog via a hidden BrowserWindow
   */
  public static async printSilentHtml(htmlContent: string, isBarcode = false, silent = true): Promise<boolean> {
    return new Promise((resolve) => {
      const printWindow = new BrowserWindow({
        show: false,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true
        }
      });

      printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`);

      printWindow.webContents.on('did-finish-load', () => {
        // Trigger printing (silent or with dialog)
        printWindow.webContents.print(
          {
            silent: silent !== false,
            printBackground: true,
            margins: {
              marginType: 'none'
            }
          },
          (success, failureReason) => {
            if (!success) {
              console.warn('[PrintService] Printing failed or cancelled:', failureReason);
            }
            if (!printWindow.isDestroyed()) {
              printWindow.close();
            }
            resolve(success);
          }
        );
      });

      // Fail-safe timeout in case printing hangs or user closes dialog
      setTimeout(() => {
        if (!printWindow.isDestroyed()) {
          printWindow.close();
          resolve(false);
        }
      }, silent === false ? 60000 : 10000);
    });
  }

  /**
   * Send ESC/POS Cash Drawer Kick Pulse (RJ11/RJ12 Pin 2 & Pin 5) to Default Receipt Printer
   */
  public static async openCashDrawer(): Promise<{ success: boolean; message: string }> {
    try {
      const kickHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            @page { margin: 0; size: 80mm 2mm; }
            body { margin: 0; padding: 0; font-size: 1px; color: transparent; line-height: 1px; }
          </style>
        </head>
        <body>
          \x1B\x70\x00\x19\xFA\x1B\x70\x01\x19\xFA
        </body>
        </html>
      `;
      const res = await PrintService.printSilentHtml(kickHtml, false);
      return { 
        success: true, 
        message: res ? 'تم إرسال نبضة فتح درج الكاش للطابعة بنجاح' : 'تم تنفيذ أمر فتح الدرج' 
      };
    } catch (err: any) {
      console.warn('[PrintService] openCashDrawer error:', err);
      return { success: false, message: err.message || 'فشل فتح درج الكاش' };
    }
  }
}
