# Generador de Certificados Automático ✨

Esta aplicación te permite generar certificados de manera automática a partir de una imagen de plantilla y datos de un archivo Excel.

## 🚀 Características

- **Subida de imagen**: Carga tu plantilla de certificado en formato JPG, PNG, etc.
- **Importación de Excel**: Lee datos desde archivos .xlsx/.xls con soporte completo para caracteres especiales y tildes
- **Posicionamiento interactivo mejorado**: Sistema visual con campos verdes/rojos que puedes arrastrar fácilmente
- **Vista previa en tiempo real**: Visualiza cómo se verá el certificado antes de generar todos
- **Generación masiva en ZIP**: Crea automáticamente todos los certificados y los descarga en un archivo ZIP
- **Personalización completa**: Ajusta tamaño de fuente, color y posición de cada campo
- **Soporte para caracteres especiales**: Maneja perfectamente nombres con tildes, ñ y otros caracteres especiales

## 📋 Cómo usar (Nuevo Flujo por Pasos)

La aplicación ahora funciona como un asistente (wizard) de 3 pasos simples.

### Paso 1: Cargar datos (Excel / CSV)
1. Sube un archivo `.xlsx`, `.xls` o `.csv`.
2. La primera fila debe contener los encabezados (ej: `nombre, apellido, curso, codigo, fecha`).
3. Se mostrará una vista previa de las primeras filas para validar que los campos fueron detectados correctamente.
4. Pulsa “Siguiente” para continuar cuando estés conforme.

### Paso 2: Subir imagen y posicionar campos
1. Sube la plantilla del certificado (PNG / JPG recomendado).
2. Verás la imagen y sobre ella los campos detectados (por defecto con valores de la primera fila — puedes alternar con placeholders).
3. Arrastra cada campo para ubicarlo donde debe aparecer en el certificado final.
4. Ajusta tamaño, color y coordenadas exactas con los controles.
5. Pulsa “Siguiente” para generar una vista previa.

### Paso 3: Vista previa y generación
1. Se genera automáticamente una vista previa usando la primera fila de datos.
2. Si deseas, puedes actualizar la vista previa tras mover campos (regresando al paso 2 y volviendo).
3. Pulsa “Generar ZIP” para crear todos los certificados como imágenes PNG comprimidas en un archivo ZIP.
4. El nombre de cada archivo se normaliza para evitar caracteres problemáticos.

## 📁 Archivo de ejemplo

Se incluye un archivo `ejemplo-datos.csv` con caracteres especiales:

```csv
nombre,apellido,curso,codigo,fecha
Juan Carlos,Pérez González,Angular Avanzado,ANG001,17 de septiembre de 2025
María José,García Martínez,React Fundamentals,REA001,17 de septiembre de 2025
José María,Fernández Ruiz,JavaScript ES6+,JS001,17 de septiembre de 2025
Carmen Lucía,Jiménez Vásquez,Python para Datos,PY001,17 de septiembre de 2025
```

## 🎨 Mejoras visuales

### Sistema de posicionamiento interactivo:
- **Campos verdes**: Campos disponibles para posicionar
- **Campo rojo**: Campo actualmente seleccionado
- **Cursor de movimiento**: Aparece cuando pasas sobre un campo
- **Bordes punteados**: Indican el área de cada campo
- **Controles precisos**: Coordenadas exactas en tiempo real

### Interfaz mejorada:
- ✅ Instrucciones claras y visibles
- ✅ Botones con estados (deshabilitados durante generación)
- ✅ Indicador de progreso
- ✅ Mensajes informativos
- ✅ Diseño responsivo

## 🛠️ Tecnologías utilizadas

- **Angular 18**: Framework principal
- **TypeScript**: Lenguaje de programación
- **HTML5 Canvas**: Para el posicionamiento interactivo
- **XLSX.js**: Para leer archivos Excel con soporte UTF-8
- **JSZip**: Para crear archivos ZIP
- **FileSaver.js**: Para descargar archivos
- **CSS Grid**: Para el diseño responsivo

## ⚡ Nuevas características

### ✅ Soporte completo para caracteres especiales
- Maneja correctamente tildes: á, é, í, ó, ú
- Soporta ñ y otros caracteres especiales
- Normalización de texto para compatibilidad

### ✅ Descarga en ZIP
- Todos los certificados se generan como imágenes PNG
- Se comprimen automáticamente en un archivo ZIP
- Nombres de archivo seguros (sin caracteres conflictivos)
- Un solo clic para descargar todo

### ✅ Posicionamiento interactivo mejorado
- Selección visual de campos
- Arrastrar y soltar intuitivo
- Límites del canvas respetados
- Feedback visual en tiempo real

## 📱 Uso en Vercel

Esta aplicación está optimizada para desplegarse en Vercel:
- ✅ Sin backend requerido
- ✅ Procesamiento 100% en el frontend
- ✅ Compatible con navegadores modernos

## ⚠️ Consideraciones importantes

- **Caracteres especiales**: ✅ Totalmente soportados
- **Tamaño de archivos**: Optimizado para imágenes grandes
- **Formato de descarga**: PNG en ZIP (mejor calidad)
- **Navegadores**: Chrome, Firefox, Safari y Edge
- **Memoria**: Optimizado para manejar cientos de certificados

## 🔧 Comandos de desarrollo

```bash
# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
ng serve

# Construir para producción
ng build
```

## 🎯 Ejemplo de uso completo

1. **Prepara tu Excel** con datos como:
   ```
   nombre          | apellido        | curso           | codigo
   María José      | García Martínez | Angular Pro     | ANG001
   José Ángel      | Rodríguez Péña  | React Advanced  | REA001
   ```

2. **Sube tu imagen** de certificado

3. **Sube el Excel** y verás los campos automáticamente

4. **Posiciona los campos**:
   - Haz clic en "nombre" → aparece en rojo
   - Arrastra donde quieres que aparezca el nombre
   - Repite para apellido, curso, etc.

5. **Genera** → ¡Descarga ZIP con todos los certificados!

¡Listo para generar certificados profesionales con soporte completo para español! 🎓✨🇪🇸
