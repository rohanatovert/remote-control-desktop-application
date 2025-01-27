/* eslint-disable @typescript-eslint/await-thenable */
import {
    ChangeDetectorRef,
    Component,
    HostListener,
    Inject,
    OnInit,
} from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import 'webrtc-adapter';
import { ElectronService } from '../../app/core/services/electron.service';
import { ConnectService } from './../../app/core/services/connect.service';

import {
    MatDialog,
    MatDialogRef,
    MAT_DIALOG_DATA,
} from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActionSheetController } from '@ionic/angular';
import { SettingsService } from '../../app/core/services/settings.service';

export interface DialogData {
    pw: string;
    newPw: string;
}
@Component({
    selector: 'set-pw',
    template: `
        <div mat-dialog-content>
            <mat-form-field
                [class.is-invalid]="!newPasswordCheck.correct"
                [class.is-valid]="newPasswordCheck.correct">
                <mat-label>{{ 'Password' | translate }}</mat-label>
                <input
                    matInput
                    [(ngModel)]="data.pw"
                    type="password" />
            </mat-form-field>
            <mat-form-field
                [class.is-invalid]="!newPasswordCheck.correct"
                [class.is-valid]="newPasswordCheck.correct">
                <mat-label>{{ 'Repeat Password' | translate }}</mat-label>
                <input
                    matInput
                    [(ngModel)]="data.newPw"
                    type="password" />
            </mat-form-field>
            <app-password-check
                [password]="data.pw"
                #newPasswordCheck></app-password-check>
        </div>
        <div
            mat-dialog-actions
            style="
    flex-wrap: nowrap;">
            <button
                mat-button
                (click)="cancel()">
                {{ 'Cancel' | translate }}
            </button>
            <button
                mat-button
                (click)="save()"
                [disabled]="
                    !(newPasswordCheck.correct && data.pw === data.newPw)
                ">
                {{ 'Save' | translate }}
            </button>
        </div>
    `,
})
export class SetPwDialog {
    @HostListener('document:keydown.enter', ['$event'])
    handleKeyboardEvent(event: KeyboardEvent) {
        event.preventDefault();
        event.stopPropagation();
        this.save();
    }

    constructor(
        public dialogRef: MatDialogRef<SetPwDialog>,
        @Inject(MAT_DIALOG_DATA) public data: DialogData,
        private _snackBar: MatSnackBar,
        private translateService: TranslateService
    ) {}

    save() {
        if (this.data.pw == this.data.newPw) {
            this.dialogRef.close(this.data);
        } else {
            this._snackBar.open(
                this.translateService.instant('Password does not match'),
                null,
                {
                    duration: 2000,
                }
            );
        }
    }

    cancel(): void {
        this.dialogRef.close();
    }
}

@Component({
    selector: 'app-settings',
    templateUrl: './settings.page.html',
    styleUrls: ['./settings.page.scss'],
})
export class SettingsPage implements OnInit {
    compName = '';
    autoStartEnabled = false;
    autoLaunch;

    hiddenAccess = false;

    constructor(
        private electronService: ElectronService,
        private cdr: ChangeDetectorRef,
        public dialog: MatDialog,
        private translate: TranslateService,
        private actionSheetCtrl: ActionSheetController,
        public settingsService: SettingsService,
        private connectService: ConnectService
    ) {}

    ngOnInit() {
        const loginSettings = this.electronService.app.getLoginItemSettings();

        this.autoStartEnabled = loginSettings.executableWillLaunchAtLogin;
        console.log();
        this.compName = this.electronService.os.hostname();
        /* this.autoLaunch = new this.electronService.autoLaunch({
      name: 'Remotecontrol - Desktop',
      path: this.electronService.remote.app.getPath('exe'),
      isHidden: true,
    }); */
        // const isEnabled = await this.autoLaunch.isEnabled();
        // this.autoStartEnabled = false; // isEnabled;
        this.cdr.detectChanges();
    }

    async checkForUpdates() {
        try {
            await this.electronService.autoUpdater.autoUpdater.checkForUpdates();
        } catch (error) {
            console.log('error', error);
        }
    }

    public async selectLanguage(ev): Promise<any> {
        const actionSheetCtrl = await this.actionSheetCtrl.create({
            translucent: true,
            buttons: [
                {
                    text: 'Deutsch',
                    handler: () => {
                        this.changeLanguage({ code: 'de', text: 'Deutsch' });
                    },
                },
                {
                    text: 'English',
                    handler: () => {
                        this.changeLanguage({ code: 'en', text: 'English' });
                    },
                },
            ],
        });

        await actionSheetCtrl.present();
    }

    async changeLanguage(selection: { text: string; code: string }) {
        await this.settingsService.saveSettings({
            language: selection,
        });

        this.settingsService.language = selection;
        this.translate.use(selection.code);
    }

    async changeHiddenAccess() {
        await this.settingsService.saveSettings({
            hiddenAccess: this.settingsService.settings.hiddenAccess,
        });
    }

    async randomIdChange() {
        await this.settingsService.saveSettings({
            randomId: this.settingsService.settings.randomId,
        });
        this.connectService.reconnect();
    }

    addPw() {
        const dialogRef = this.dialog.open(SetPwDialog, {
            width: '250px',
            data: {
                pw: '',
                newPw: '',
            },
        });

        dialogRef.afterClosed().subscribe(result => {
            console.log('The dialog was closed', result);
            if (result?.pw) {
                this.setPwHash(result.pw);
            }
        });
    }

    async setPwHash(pw) {
        const hash = await this.electronService.bcryptjs.hash(pw, 5);

        await this.settingsService.saveSettings({
            passwordHash: hash,
        });
    }

    changeAutoStart() {
        if (this.autoStartEnabled) {
            this.electronService.app.setLoginItemSettings({
                openAsHidden: true,
                openAtLogin: true,
                name: 'Remotecontrol Desktop',
                args: ['--hidden'],
            });
        } else {
            this.electronService.app.setLoginItemSettings({
                openAsHidden: false,
                openAtLogin: false,
                name: 'Remotecontrol Desktop',
                args: ['--hidden'],
            });
        }
        /*this.autoLaunch.isEnabled().then((isEnabled) => {
      if (isEnabled) {
        this.autoLaunch.disable();
      } else {
        this.autoLaunch.enable();
      }
    });*/
    }
}
