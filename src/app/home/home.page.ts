import { Component, OnInit, OnDestroy } from '@angular/core';
import { ToastController, AlertController, IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LocalNotifications } from '@capacitor/local-notifications';

interface Tugas {
  id: number;
  judul: string;
  deskripsi: string;
  deadline: string;
  status: string;
}

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule]
})
export class HomePage implements OnInit, OnDestroy {
  username: string = 'Sobat';
  listTugas: Tugas[] = [];
  
  // Variabel Modal Tambah Tugas
  isModalOpen = false;
  isEditMode = false;
  selectedIndex: number | null = null;
  judul = '';
  deskripsi = '';
  deadline = new Date().toISOString();

  // Variabel Modal Ringkasan Khusus
  isModalRingkasanOpen = false;
  teksInputRingkasan = '';
  hasilRingkasan = '';

  // Variabel Timer
  timer: any;
  timerValue = 25 * 60;
  displayTime = '25:00';
  isTimerRunning = false;

  constructor(
    private toastCtrl: ToastController,
    private alertCtrl: AlertController
  ) {}

  async ngOnInit() {
    this.loadData();
    // Meminta izin notifikasi saat aplikasi pertama kali dijalankan agar suara & notif aktif
    await LocalNotifications.requestPermissions();
  }

  ngOnDestroy() {
    this.stopTimer();
  }

  loadData() {
    const data = localStorage.getItem('tugas_user');
    if (data) {
      this.listTugas = JSON.parse(data);
    }
  }

  saveData() {
    localStorage.setItem('tugas_user', JSON.stringify(this.listTugas));
  }

  // ================= FITUR LOGOUT =================

  async logout() {
    const alert = await this.alertCtrl.create({
      header: 'Keluar Aplikasi',
      message: 'Apakah kamu yakin ingin menutup aplikasi StudyFlow?',
      buttons: [
        { text: 'Batal', role: 'cancel' },
        {
          text: 'Ya, Keluar',
          handler: () => {
            const nav = navigator as any;
            if (nav.app && nav.app.exitApp) {
              nav.app.exitApp();
            } else {
              this.showToast('Fitur keluar hanya aktif di perangkat mobile.', 'warning');
            }
          }
        }
      ]
    });
    await alert.present();
  }

  // ================= MANAJEMEN RINGKASAN =================
  
  bukaModalRingkasan() {
    this.teksInputRingkasan = '';
    this.hasilRingkasan = '';
    this.isModalRingkasanOpen = true;
  }

  prosesRingkasOtomatis() {
    if (!this.teksInputRingkasan || this.teksInputRingkasan.trim().length < 30) {
      this.showToast('Masukkan teks yang lebih panjang untuk diringkas!', 'warning');
      return;
    }

    const sentences = this.teksInputRingkasan.match(/[^\.!\?]+[\.!\?]+/g) || [this.teksInputRingkasan];
    
    if (sentences.length <= 2) {
      const words = this.teksInputRingkasan.split(' ');
      this.hasilRingkasan = words.slice(0, Math.ceil(words.length * 0.6)).join(' ') + "...";
    } else {
      const limit = Math.max(1, Math.floor(sentences.length * 0.4));
      this.hasilRingkasan = sentences.slice(0, limit).join(' ').trim();
    }
    this.showToast('Berhasil diringkas otomatis! 🤖', 'success');
  }

  gunakanRingkasan() {
    this.deskripsi = this.hasilRingkasan;
    this.isModalRingkasanOpen = false;
    this.showToast('Ringkasan disalin ke deskripsi!', 'primary');
  }

  // ================= MANAJEMEN TUGAS & NOTIFIKASI OTOMATIS =================
  
  openModal(tugas?: Tugas, index?: number) {
    if (tugas && index !== undefined) {
      this.isEditMode = true;
      this.selectedIndex = index;
      this.judul = tugas.judul;
      this.deskripsi = tugas.deskripsi;
      this.deadline = tugas.deadline;
    } else {
      this.resetForm();
    }
    this.isModalOpen = true;
  }

  resetForm() {
    this.judul = '';
    this.deskripsi = '';
    this.deadline = new Date().toISOString();
    this.isEditMode = false;
    this.selectedIndex = null;
  }

  async simpanTugas() {
    if (!this.judul || !this.deadline) {
      this.showToast('Judul dan Deadline wajib isi!', 'warning');
      return;
    }

    const idTugas = this.isEditMode && this.selectedIndex !== null ? 
                   this.listTugas[this.selectedIndex].id : Date.now();

    const dataTugas: Tugas = {
      id: idTugas,
      judul: this.judul,
      deskripsi: this.deskripsi,
      deadline: this.deadline,
      status: 'Belum'
    };

    if (this.isEditMode && this.selectedIndex !== null) {
      this.listTugas[this.selectedIndex] = dataTugas;
    } else {
      this.listTugas.push(dataTugas);
    }

    this.saveData();
    
    // REKOMENDASI: JADWALKAN NOTIFIKASI H-3, H-1, H-0 SEKALIGUS
    await this.buatJadwalNotifikasi(dataTugas);

    this.isModalOpen = false;
    this.showToast('Tugas tersimpan & Pengingat aktif! 🔔', 'success');
  }

  async buatJadwalNotifikasi(tugas: Tugas) {
    const targetDeadline = new Date(tugas.deadline).getTime();
    const satuHari = 24 * 60 * 60 * 1000;
    const sekarang = Date.now();

    const notifikasiArray = [];
    const daftarPengingat = [
      { hari: 3, pesan: '3 hari lagi' },
      { hari: 1, pesan: 'Besok' },
      { hari: 0, pesan: 'Hari ini' }
    ];

    for (let pengingat of daftarPengingat) {
      const waktuNotif = new Date(targetDeadline - (pengingat.hari * satuHari));
      waktuNotif.setHours(8, 0, 0, 0); // Notifikasi muncul jam 8 pagi

      if (waktuNotif.getTime() > sekarang) {
        notifikasiArray.push({
          title: `Deadline: ${tugas.judul}`,
          body: `Tugasmu harus selesai ${pengingat.pesan}! Semangat! 🚀`,
          id: Math.floor(idTugas_ke_IDNotif(tugas.id) + pengingat.hari),
          schedule: { at: waktuNotif },
          channelId: 'default',
          allowInLowPowerMode: true
        });
      }
    }

    if (notifikasiArray.length > 0) {
      await LocalNotifications.schedule({ notifications: notifikasiArray });
    }
  }

  toggleStatus(index: number) {
    this.listTugas[index].status = this.listTugas[index].status === 'Belum' ? 'Selesai' : 'Belum';
    this.saveData();
  }

  async hapusTugas(index: number) {
    const id = this.listTugas[index].id;
    this.listTugas.splice(index, 1);
    this.saveData();
    // Batalkan notifikasi yang sudah dijadwalkan agar tidak muncul jika tugas dihapus
    await LocalNotifications.cancel({ notifications: [{ id }] });
  }

  // ================= TIMER FOKUS & ISTIRAHAT OTOMATIS =================

  startTimer() {
    if (this.isTimerRunning) return;
    this.isTimerRunning = true;
    this.timer = setInterval(() => {
      if (this.timerValue > 0) {
        this.timerValue--;
        this.updateDisplayTime();
      } else {
        this.stopTimer();
        this.timerSelesai();
      }
    }, 1000);
  }

  stopTimer() { clearInterval(this.timer); this.isTimerRunning = false; }
  resetTimer() { this.stopTimer(); this.timerValue = 25 * 60; this.updateDisplayTime(); }
  
  updateDisplayTime() {
    const m = Math.floor(this.timerValue / 60);
    const s = this.timerValue % 60;
    this.displayTime = `${m}:${s < 10 ? '0' + s : s}`;
  }

  // REKOMENDASI: Fungsi saat fokus habis, langsung bunyi dan tawari istirahat
  async timerSelesai() {
    this.showToast('🚨 WAKTUNYA ISTIRAHAT, SOBAT!', 'danger');

    try {
      await LocalNotifications.schedule({
        notifications: [{ 
          title: 'SESI FOKUS SELESAI! ☕', 
          body: 'Kerja bagus! Sekarang istirahat 5 menit ya, regangkan badanmu.', 
          id: 999, 
          schedule: { at: new Date(Date.now() + 500) },
          channelId: 'default',
          sound: 'default' 
        }]
      });
    } catch (e) { console.log('Notification error', e); }

    // Otomatis pindah ke mode istirahat
    this.mulaiTimerIstirahat();
  }

  mulaiTimerIstirahat() {
    this.stopTimer(); 
    this.timerValue = 5 * 60; // Set otomatis ke 5 menit
    this.updateDisplayTime();
    
    setTimeout(() => {
      this.startTimer();
      this.showToast('Timer Istirahat Dimulai (5 Menit)', 'success');
    }, 1500);
  }

  async showToast(msg: string, color: string = 'primary') {
    const toast = await this.toastCtrl.create({ message: msg, duration: 2000, color: color, position: 'top' });
    toast.present();
  }

  getProgress() { return this.listTugas.length === 0 ? 0 : this.getCountSelesai() / this.listTugas.length; }
  getCountSelesai() { return this.listTugas.filter(t => t.status === 'Selesai').length; }
  getCountBelum() { return this.listTugas.filter(t => t.status === 'Belum').length; }
}

// Fungsi bantu untuk ID notifikasi unik agar tidak bentrok
function idTugas_ke_IDNotif(id: number): number {
  return parseInt(id.toString().substring(5, 10));
}