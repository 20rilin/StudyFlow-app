import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { HomePage } from './home.page';
import { HomePageRoutingModule } from './home-routing.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    HomePageRoutingModule,
    HomePage // ✅ Masukkan ke sini karena dia Standalone
  ],
  declarations: [] // ✅ KOSONGKAN INI agar tidak error NG6008
})
export class HomePageModule {}