import { Component, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

interface ExcelRow {
  [key: string]: any;
}

interface FieldSettings {
  fontSize: number;
  color: string;
  x: number;
  y: number;
  fontFamily?: string;
}

@Component({
  selector: 'app-certificate-generator',
  imports: [CommonModule, FormsModule],
  templateUrl: './certificate-generator.component.html',
  styleUrl: './certificate-generator.component.css'
})
export class CertificateGeneratorComponent implements AfterViewInit {
  @ViewChild('fabricCanvas', { static: false }) canvasRef!: ElementRef<HTMLCanvasElement>;

  selectedImage: string | null = null;
  excelData: ExcelRow[] = [];
  excelHeaders: string[] = [];
  canvas: HTMLCanvasElement | null = null;
  ctx: CanvasRenderingContext2D | null = null;
  fieldSettings: { [key: string]: FieldSettings } = {};
  previewUrl: string | null = null;
  imageFile: File | null = null;
  backgroundImage: HTMLImageElement | null = null;
  isDragging = false;
  dragFieldName = '';
  dragOffset = { x: 0, y: 0 };
  selectedFieldName = '';
  isGenerating = false;
  imageReady = false;
  showRealData = true; // toggle para mostrar valores reales vs placeholders
  currentStep = 1; // 1: subir excel, 2: subir imagen y posicionar, 3: vista previa/generar
  showGrid = true;
  snapToGrid = true;
  gridSize = 10;
  lastDragPosition: {x:number,y:number}|null = null;
  groupByColumn: string = '';
  progressPercent = 0;
  showAlignmentGuides = true;
  alignmentGuideX: number | null = null;
  alignmentGuideY: number | null = null;
  alignmentThreshold = 6; // px de tolerancia
  showGuideDistances = true;
  guideDistanceLabels: { x?: number; y?: number; value?: string } = {};
  overlayMode:boolean = true;
  expandedPanels: { [key:string]: boolean } = { __opts: true };

  availableFonts: string[] = [
    'Arial','Roboto','Lato','Poppins','Montserrat','Open Sans',
    'Source Sans Pro','Merriweather','Inter','Nunito','Playfair Display',
    'Oswald','Raleway','Ubuntu','Fira Sans','Inconsolata','Cairo','Manrope'
  ];

  private eventsInitialized = false;

  goToStep(step: number) {
    if (step < 1 || step > 3) return;
    // Validaciones simples
    if (step === 2 && this.excelHeaders.length === 0) {
      alert('Primero sube un archivo Excel o CSV válido.');
      return;
    }
    if (step === 3) {
      if (!this.backgroundImage) {
        alert('Primero sube la imagen y posiciona los campos.');
        return;
      }
      if (this.excelData.length) {
        // Generar vista previa automática al entrar al paso 3
        this.previewCertificate();
      }
    }
    this.currentStep = step;
    // Redibujar canvas si regresan al paso 2
    if (this.currentStep === 2) {
      // Esperar a que Angular pinte el canvas de nuevo
      setTimeout(()=> this.ensureCanvasReady(), 0);
    }
  }
  ensureCanvasReady(){
    if(!this.backgroundImage) return; // nada que hacer
    if(!this.canvasRef) return; // ViewChild aún no disponible
    const el = this.canvasRef.nativeElement;
    if(!el) return;
    if(!this.canvas){ this.canvas = el; }
    if(!this.ctx){ this.ctx = this.canvas.getContext('2d'); }
    if(!this.ctx) return;
    if(!this.canvas.width || !this.canvas.height){
      const img = this.backgroundImage;
      const maxWidth = 800; const maxHeight = 600;
      let cw = img.width; let ch = img.height;
      if (cw > maxWidth) { ch = (ch * maxWidth) / cw; cw = maxWidth; }
      if (ch > maxHeight) { cw = (cw * maxHeight) / ch; ch = maxHeight; }
      this.canvas.width = cw; this.canvas.height = ch;
    }
    if(!this.eventsInitialized){ this.setupCanvasEvents(); this.eventsInitialized = true; }
    this.redrawCanvas();
  }
  ngAfterViewInit() {
    // El canvas se inicializará cuando se cargue la imagen
  }

  onImageSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.imageFile = file;
      const reader = new FileReader();
      reader.onload = (e) => {
        this.selectedImage = e.target?.result as string;
        setTimeout(() => {
          this.initializeCanvas();
        }, 100);
      };
      reader.readAsDataURL(file);
    }
  }

  onExcelSelected(event: any) {
    const file: File = event.target.files[0];
    if (!file) return;

    const isCSV = file.name.toLowerCase().endsWith('.csv');
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        if (isCSV) {
          const text = e.target?.result as string;
          const lines = text.split(/\r?\n/).filter(l => l.trim().length);
          if (!lines.length) return;
          const headers = lines[0].split(',').map(h => h.trim());
            const rows: ExcelRow[] = [];
          for (let i = 1; i < lines.length; i++) {
            const cols = lines[i].split(',');
            if (!cols.length) continue;
            const row: ExcelRow = {};
            headers.forEach((h, idx) => {
              const raw = (cols[idx] || '').trim();
              row[h] = this.fixEncoding(raw);
            });
            rows.push(row);
          }
          this.excelData = rows;
          this.excelHeaders = headers;
        } else {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { raw: false, defval: '' }) as ExcelRow[];
          this.excelData = jsonData.map(r => {
            const fixed: ExcelRow = {};
            Object.keys(r).forEach(k => fixed[k] = this.fixEncoding(String(r[k] ?? '')));
            return fixed;
          });
          if (this.excelData.length) {
            this.excelHeaders = Object.keys(this.excelData[0]);
          }
        }
        if (this.excelData.length) {
          this.initializeFieldSettings();
          this.redrawCanvas();
        }
      } catch (err) {
        console.error('Error leyendo archivo', err);
        alert('Archivo inválido o formato no soportado');
      }
    };
    if (isCSV) reader.readAsText(file, 'utf-8'); else reader.readAsArrayBuffer(file);
  }

  private fixEncoding(value: string): string {
    try {
      const needsFix = /Ã.|Â./.test(value);
      if (needsFix) {
        const bytes = new Uint8Array([...value].map(c => c.charCodeAt(0)));
        const decoded = new TextDecoder('utf-8').decode(bytes);
        return decoded.normalize('NFC');
      }
      return value.normalize('NFC');
    } catch {
      return value;
    }
  }

  private initializeFieldSettings() {
    this.excelHeaders.forEach((header, index) => {
      if (!this.fieldSettings[header]) {
        this.fieldSettings[header] = {
          fontSize: 24,
          color: '#000000',
          x: 100 + (index * 30),
          y: 100 + (index * 40),
          fontFamily: 'Arial'
        };
      }
    });
  }

  initializeCanvas() {
    if (this.canvasRef && this.selectedImage) {
      this.canvas = this.canvasRef.nativeElement;
      this.ctx = this.canvas.getContext('2d');
      if (!this.ctx) return;
      const img = new Image();
      img.onload = () => {
        const maxWidth = 800;
        const maxHeight = 600;
        let canvasWidth = img.width;
        let canvasHeight = img.height;
        if (canvasWidth > maxWidth) {
          canvasHeight = (canvasHeight * maxWidth) / canvasWidth;
          canvasWidth = maxWidth;
        }
        if (canvasHeight > maxHeight) {
          canvasWidth = (canvasWidth * maxHeight) / canvasHeight;
          canvasHeight = maxHeight;
        }
        this.canvas!.width = canvasWidth;
        this.canvas!.height = canvasHeight;
        this.backgroundImage = img;
        this.imageReady = true;
        this.redrawCanvas();
        if(!this.eventsInitialized){
          this.setupCanvasEvents();
          this.eventsInitialized = true;
        }
      };
      img.src = this.selectedImage;
    }
  }

  redrawCanvas() {
    if (!this.ctx || !this.backgroundImage || !this.canvas) return;

    // Limpiar canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Dibujar imagen de fondo
    this.ctx.drawImage(this.backgroundImage, 0, 0, this.canvas.width, this.canvas.height);

    // Dibujar grid si está activo
    if (this.showGrid) {
      const g = this.gridSize;
      this.ctx.save();
      this.ctx.strokeStyle = 'rgba(0,0,0,0.08)';
      this.ctx.lineWidth = 1;
      for (let x = 0; x <= this.canvas.width; x += g) {
        this.ctx.beginPath();
        this.ctx.moveTo(x + 0.5, 0);
        this.ctx.lineTo(x + 0.5, this.canvas.height);
        this.ctx.stroke();
      }
      for (let y = 0; y <= this.canvas.height; y += g) {
        this.ctx.beginPath();
        this.ctx.moveTo(0, y + 0.5);
        this.ctx.lineTo(this.canvas.width, y + 0.5);
        this.ctx.stroke();
      }
      this.ctx.restore();
    }
    
    // Dibujar campos de texto con mejor visualización
    this.excelHeaders.forEach(header => {
      const settings = this.fieldSettings[header];
      const isSelected = this.selectedFieldName === header;
      const sampleValue = this.excelData.length ? String(this.excelData[0][header] ?? '') : '';
      const displayText = this.showRealData && sampleValue ? sampleValue : `[${header}]`;
  this.ctx!.font = `${settings.fontSize}px ${settings.fontFamily || 'Arial'}`;
      this.ctx!.fillStyle = settings.color;
      const textWidth = this.ctx!.measureText(displayText).width;
  this.ctx!.fillText(displayText, settings.x, settings.y);
      this.ctx!.strokeStyle = isSelected ? '#ff0000' : '#00b894';
      this.ctx!.lineWidth = isSelected ? 3 : 2;
      this.ctx!.setLineDash(isSelected ? [5, 5] : []);
      const padding = 5;
      this.ctx!.strokeRect(
        settings.x - padding,
        settings.y - settings.fontSize - padding,
        textWidth + (padding * 2),
        settings.fontSize + (padding * 2)
      );
      this.ctx!.setLineDash([]);
      this.ctx!.fillStyle = isSelected ? '#ff0000' : '#00b894';
      this.ctx!.fillRect(settings.x - 3, settings.y - settings.fontSize - 3, 6, 6);
    });

    // Dibujar guías de alineación si existen
    if (this.showAlignmentGuides) {
      this.ctx.save();
      this.ctx.strokeStyle = 'rgba(255,0,255,0.8)';
      this.ctx.lineWidth = 1.5;
      this.ctx.setLineDash([6,4]);
      if (this.alignmentGuideX !== null) {
        this.ctx.beginPath();
        this.ctx.moveTo(this.alignmentGuideX + 0.5, 0);
        this.ctx.lineTo(this.alignmentGuideX + 0.5, this.canvas.height);
        this.ctx.stroke();
      }
      if (this.alignmentGuideY !== null) {
        this.ctx.beginPath();
        this.ctx.moveTo(0, this.alignmentGuideY + 0.5);
        this.ctx.lineTo(this.canvas.width, this.alignmentGuideY + 0.5);
        this.ctx.stroke();
      }
      // Guías centrales globales (opcionales siempre visibles cuando showAlignmentGuides)
      this.ctx.strokeStyle = 'rgba(0,0,0,0.15)';
      this.ctx.setLineDash([4,6]);
      const centerX = this.canvas.width / 2;
      const centerY = this.canvas.height / 2;
      this.ctx.beginPath(); this.ctx.moveTo(centerX + 0.5, 0); this.ctx.lineTo(centerX + 0.5, this.canvas.height); this.ctx.stroke();
      this.ctx.beginPath(); this.ctx.moveTo(0, centerY + 0.5); this.ctx.lineTo(this.canvas.width, centerY + 0.5); this.ctx.stroke();

      // Distancias
      if (this.showGuideDistances) {
        this.ctx.font = '12px Arial';
        this.ctx.fillStyle = '#ff00ff';
        this.ctx.strokeStyle = '#fff';
        this.ctx.lineWidth = 3;
        if (this.guideDistanceLabels.value && (this.alignmentGuideX !== null || this.alignmentGuideY !== null)) {
          const label = this.guideDistanceLabels.value;
          const lx = (this.guideDistanceLabels.x ?? 10) + 0.5;
          const ly = (this.guideDistanceLabels.y ?? 15) + 0.5;
          this.ctx.strokeText(label, lx, ly);
          this.ctx.fillText(label, lx, ly);
        }
      }
      this.ctx.restore();
    }
  }

  setupCanvasEvents() {
    if (!this.canvas) return;

    this.canvas.addEventListener('mousedown', (e) => {
      const rect = this.canvas!.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      // Verificar si se hizo clic en algún campo
      let fieldFound = false;
      for (const header of this.excelHeaders) {
        const settings = this.fieldSettings[header];
        const sampleValue = this.excelData.length ? String(this.excelData[0][header] ?? '') : '';
        const displayText = this.showRealData && sampleValue ? sampleValue : `[${header}]`;
        const textWidth = this.ctx!.measureText(displayText).width;
        
        if (x >= settings.x - 5 && x <= settings.x + textWidth + 5 && 
            y >= settings.y - settings.fontSize - 5 && y <= settings.y + 5) {
          this.isDragging = true;
          this.dragFieldName = header;
          this.selectedFieldName = header;
          this.dragOffset.x = x - settings.x;
          this.dragOffset.y = y - settings.y;
          fieldFound = true;
          break;
        }
      }
      
      if (!fieldFound) {
        this.selectedFieldName = '';
      }
      
      this.redrawCanvas();
    });

    this.canvas.addEventListener('mousemove', (e) => {
      if (!this.isDragging) {
        // Cambiar cursor cuando esté sobre un campo
        const rect = this.canvas!.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        let overField = false;
        for (const header of this.excelHeaders) {
          const settings = this.fieldSettings[header];
          const sampleValue = this.excelData.length ? String(this.excelData[0][header] ?? '') : '';
          const displayText = this.showRealData && sampleValue ? sampleValue : `[${header}]`;
          const textWidth = this.ctx!.measureText(displayText).width;
          
          if (x >= settings.x - 5 && x <= settings.x + textWidth + 5 && 
              y >= settings.y - settings.fontSize - 5 && y <= settings.y + 5) {
            overField = true;
            break;
          }
        }
        
        this.canvas!.style.cursor = overField ? 'move' : 'default';
        return;
      }

      const rect = this.canvas!.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
  const sampleValue = this.excelData.length ? String(this.excelData[0][this.dragFieldName] ?? '') : '';
  const displayText = this.showRealData && sampleValue ? sampleValue : `[${this.dragFieldName}]`;
  const textWidth = this.ctx!.measureText(displayText).width;
      let newX = x - this.dragOffset.x;
      let newY = y - this.dragOffset.y;
      // Snapping
      if (this.snapToGrid) {
        newX = Math.round(newX / this.gridSize) * this.gridSize;
        newY = Math.round(newY / this.gridSize) * this.gridSize;
      }
      // Alineación dinámica con otros campos
      this.alignmentGuideX = null;
      this.alignmentGuideY = null;
      if (this.showAlignmentGuides) {
        const moving = this.fieldSettings[this.dragFieldName];
        const movingMidX = moving.x + (this.ctx!.measureText(displayText).width / 2);
        const movingMidY = moving.y - (moving.fontSize / 2);
        const movingTop = moving.y - moving.fontSize;
        const movingWidth = this.ctx!.measureText(displayText).width;
        let closestXDiff = Number.MAX_VALUE;
        let closestYDiff = Number.MAX_VALUE;
        let chosenLabel = '';
        // Comprobar centro global
        const globalCenterX = this.canvas!.width / 2;
        const globalCenterY = this.canvas!.height / 2;
        if (Math.abs((newX + movingWidth/2) - globalCenterX) <= this.alignmentThreshold) {
          newX = globalCenterX - movingWidth/2;
          this.alignmentGuideX = globalCenterX;
          closestXDiff = 0;
          chosenLabel = 'Centro X';
        }
        if (Math.abs((newY - moving.fontSize/2) - globalCenterY) <= this.alignmentThreshold) {
          newY = globalCenterY + moving.fontSize/2;
          this.alignmentGuideY = globalCenterY;
          closestYDiff = 0;
          chosenLabel = chosenLabel ? chosenLabel + ' & Centro Y' : 'Centro Y';
        }
        for (const header of this.excelHeaders) {
          if (header === this.dragFieldName) continue;
            const other = this.fieldSettings[header];
          // Vertical: comparar left, center (mid), right
          const otherText = this.showRealData && this.excelData.length ? String(this.excelData[0][header] ?? '') : `[${header}]`;
          this.ctx!.font = `${other.fontSize}px ${other.fontFamily || 'Arial'}`;
          const otherWidth = this.ctx!.measureText(otherText).width;
          const otherLeft = other.x;
          const otherRight = other.x + otherWidth;
          const otherMidX = other.x + otherWidth / 2;
          // Comparar X (alineaciones verticales)
          if (Math.abs(newX - otherLeft) <= this.alignmentThreshold && Math.abs(newX - otherLeft) < closestXDiff) { newX = otherLeft; this.alignmentGuideX = otherLeft; closestXDiff = Math.abs(newX - otherLeft); chosenLabel = 'Left'; }
          else if (Math.abs((newX + movingWidth) - otherRight) <= this.alignmentThreshold && Math.abs((newX + movingWidth) - otherRight) < closestXDiff) { newX = otherRight - movingWidth; this.alignmentGuideX = otherRight; closestXDiff = Math.abs((newX + movingWidth) - otherRight); chosenLabel = 'Right'; }
          else if (Math.abs((newX + movingWidth/2) - otherMidX) <= this.alignmentThreshold && Math.abs((newX + movingWidth/2) - otherMidX) < closestXDiff) { newX = otherMidX - movingWidth/2; this.alignmentGuideX = otherMidX; closestXDiff = Math.abs((newX + movingWidth/2) - otherMidX); chosenLabel = 'Center X'; }

          // Horizontal: comparar baseline (y), top (y - fontSize), middle (y - fontSize/2)
          const otherBaseline = other.y;
          const otherTop = other.y - other.fontSize;
          const otherMidY = other.y - other.fontSize / 2;
          if (Math.abs(newY - otherBaseline) <= this.alignmentThreshold && Math.abs(newY - otherBaseline) < closestYDiff) { newY = otherBaseline; this.alignmentGuideY = otherBaseline; closestYDiff = Math.abs(newY - otherBaseline); chosenLabel = chosenLabel ? chosenLabel + ' + Baseline' : 'Baseline'; }
          else if (Math.abs((newY - moving.fontSize) - otherTop) <= this.alignmentThreshold && Math.abs((newY - moving.fontSize) - otherTop) < closestYDiff) { newY = otherTop + moving.fontSize; this.alignmentGuideY = otherTop; closestYDiff = Math.abs((newY - moving.fontSize) - otherTop); chosenLabel = chosenLabel ? chosenLabel + ' + Top' : 'Top'; }
          else if (Math.abs((newY - moving.fontSize/2) - otherMidY) <= this.alignmentThreshold && Math.abs((newY - moving.fontSize/2) - otherMidY) < closestYDiff) { newY = otherMidY + moving.fontSize/2; this.alignmentGuideY = otherMidY; closestYDiff = Math.abs((newY - moving.fontSize/2) - otherMidY); chosenLabel = chosenLabel ? chosenLabel + ' + Middle' : 'Middle'; }
        }
        if (chosenLabel) {
          this.guideDistanceLabels = { x: newX + 8, y: newY - moving.fontSize - 8, value: chosenLabel };
        } else {
          this.guideDistanceLabels = {};
        }
      }
      // Límites
      newX = Math.max(0, Math.min(newX, this.canvas!.width - textWidth - 10));
      newY = Math.max(20, Math.min(newY, this.canvas!.height - 10));
      this.fieldSettings[this.dragFieldName].x = newX;
      this.fieldSettings[this.dragFieldName].y = newY;
      this.lastDragPosition = {x:newX,y:newY};
      
      this.redrawCanvas();
    });

    this.canvas.addEventListener('mouseup', () => {
      this.isDragging = false;
      this.dragFieldName = '';
      this.canvas!.style.cursor = 'default';
  this.alignmentGuideX = null;
  this.alignmentGuideY = null;
  this.guideDistanceLabels = {};
  this.redrawCanvas();
    });

    this.canvas.addEventListener('mouseleave', () => {
      this.isDragging = false;
      this.dragFieldName = '';
      this.canvas!.style.cursor = 'default';
  this.alignmentGuideX = null;
  this.alignmentGuideY = null;
  this.guideDistanceLabels = {};
  this.redrawCanvas();
    });
  }

  addTextField(fieldName: string) {
    // Los campos ya están visibles, solo actualizar la visualización
    this.selectedFieldName = fieldName;
    this.redrawCanvas();
  }

  generateCertificate(data: ExcelRow, isPreview: boolean = false): Promise<Blob | null> {
    return new Promise((resolve) => {
      if (!this.backgroundImage) {
        resolve(null);
        return;
      }

      // Crear un canvas temporal para la generación
      const tempCanvas = document.createElement('canvas');
      const ctx = tempCanvas.getContext('2d');
      if (!ctx) {
        resolve(null);
        return;
      }

      tempCanvas.width = this.backgroundImage.width;
      tempCanvas.height = this.backgroundImage.height;
      
      // Dibujar la imagen de fondo
      ctx.drawImage(this.backgroundImage, 0, 0);

      // Calcular la escala entre el canvas de edición y la imagen original
      const scaleX = this.backgroundImage.width / this.canvas!.width;
      const scaleY = this.backgroundImage.height / this.canvas!.height;

      // Dibujar cada campo de texto con soporte para caracteres especiales
      this.excelHeaders.forEach(header => {
        const settings = this.fieldSettings[header];
        ctx.font = `${settings.fontSize * scaleX}px Arial`;
        ctx.fillStyle = settings.color;
        
        // Asegurar que el texto se renderice correctamente con caracteres especiales
        const text = String(data[header] || '').normalize('NFC');
        ctx.fillText(
          text,
          settings.x * scaleX,
          settings.y * scaleY
        );
      });

      if (isPreview) {
        this.previewUrl = tempCanvas.toDataURL('image/png');
        resolve(null);
      } else {
        // Convertir a blob para usar en ZIP
        tempCanvas.toBlob((blob) => {
          resolve(blob);
        }, 'image/png');
      }
    });
  }

  async previewCertificate() {
    if (!this.imageReady) {
      alert('La imagen todavía se está cargando. Intenta nuevamente.');
      return;
    }
    if (this.excelData.length > 0) {
      await this.generateCertificate(this.excelData[0], true);
    } else {
      alert('Sube primero un archivo Excel o CSV.');
    }
  }

  async generateAllCertificates() {
    if (this.excelData.length === 0) {
      alert('No hay datos de Excel para procesar');
      return;
    }

    if (this.isGenerating) {
      return;
    }

    this.isGenerating = true;
    
    try {
  const zip = new JSZip();
  const certificatesFolder = zip.folder('certificados');
      
      // Mostrar progreso
  const totalCertificates = this.excelData.length;
  let processedCertificates = 0;
  this.progressPercent = 0;
      
      for (const rowData of this.excelData) {
        try {
          // Generar certificado como imagen
          const imageBlob = await this.generateCertificate(rowData, false);
          
          if (imageBlob) {
            // Crear nombre de archivo seguro (sin caracteres especiales)
            const firstName = String(rowData[this.excelHeaders[0]] || 'sin_nombre')
              .normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '') // Remover diacríticos
              .replace(/[^a-zA-Z0-9]/g, '_'); // Reemplazar caracteres especiales
            
            const lastName = this.excelHeaders.length > 1 
              ? String(rowData[this.excelHeaders[1]] || '')
                  .normalize('NFD')
                  .replace(/[\u0300-\u036f]/g, '')
                  .replace(/[^a-zA-Z0-9]/g, '_')
              : '';
            
            const fileName = `certificado_${firstName}_${lastName}.png`;
            if (this.groupByColumn && rowData[this.groupByColumn] !== undefined) {
              const groupRaw = String(rowData[this.groupByColumn]) || 'grupo';
              const groupSafe = groupRaw
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/[^a-zA-Z0-9]/g, '_') || 'grupo';
              const sub = certificatesFolder!.folder(groupSafe) || certificatesFolder!;
              sub.file(fileName, imageBlob);
            } else {
              certificatesFolder!.file(fileName, imageBlob);
            }
          }
          
          processedCertificates++;
          this.progressPercent = Math.round((processedCertificates / totalCertificates) * 100);
          
          // Mostrar progreso (puedes crear una barra de progreso si quieres)
          console.log(`Procesando: ${processedCertificates}/${totalCertificates}`);
          
        } catch (error) {
          console.error('Error generando certificado:', error);
        }
      }
      
      // Generar y descargar ZIP
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const timestamp = new Date().toISOString().slice(0, 10);
      saveAs(zipBlob, `certificados_${timestamp}.zip`);
      
      alert(`Se han generado ${processedCertificates} certificados y descargado en un archivo ZIP.`);
      
    } catch (error) {
      console.error('Error generando certificados:', error);
      alert('Error al generar los certificados. Por favor, intenta de nuevo.');
    } finally {
      this.isGenerating = false;
  this.progressPercent = 100;
    }
  }

  centerField(header:string, axis:'h'|'v') {
    if(!this.canvas) return;
    const s = this.fieldSettings[header];
    if(!s) return;
    this.ctx!.font = `${s.fontSize}px ${s.fontFamily || 'Arial'}`;
    const textWidth = this.ctx!.measureText(this.showRealData && this.excelData.length ? String(this.excelData[0][header]||'') : `[${header}]`).width;
    if(axis==='h') { s.x = (this.canvas.width - textWidth)/2; }
    if(axis==='v') { s.y = (this.canvas.height + s.fontSize)/2; }
    this.redrawCanvas();
  }
  toggleFieldPanel(header:string){ this.expandedPanels[header] = !this.expandedPanels[header]; }
  toggleFullscreen(){
    const el = this.canvasRef?.nativeElement?.parentElement; // canvas-stage
    if(!el) return;
    if(document.fullscreenElement){ document.exitFullscreen(); }
    else { el.requestFullscreen().catch(()=>{}); }
  }
}
