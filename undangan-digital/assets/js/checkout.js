/**
 * CHECKOUT.JS - Validasi Form dan Handling File Upload
 */

// =============================================
// VALIDASI FORM CHECKOUT
// =============================================
function validateCheckoutForm(formData) {
    const errors = [];

    // Validasi Email
    if (!formData.email_customer || !isValidEmail(formData.email_customer)) {
        errors.push('Email tidak valid');
    }

    // Validasi Nama
    if (!formData.nama_pria || formData.nama_pria.trim() === '') {
        errors.push('Nama mempelai pria harus diisi');
    }

    if (!formData.nama_wanita || formData.nama_wanita.trim() === '') {
        errors.push('Nama mempelai wanita harus diisi');
    }

    // Validasi Lokasi
    if (!formData.lokasi_akad || formData.lokasi_akad.trim() === '') {
        errors.push('Lokasi akad harus diisi');
    }

    // Validasi Tanggal
    if (!formData.tanggal_akad) {
        errors.push('Tanggal akad harus diisi');
    }

    return errors;
}

// =============================================
// VALIDASI EMAIL
// =============================================
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// =============================================
// VALIDASI UKURAN FILE
// =============================================
function validateFileSize(file, maxSizeMB = 3) {
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    return file.size <= maxSizeBytes;
}

// =============================================
// VALIDASI TIPE FILE
// =============================================
function validateFileType(file) {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
    return allowedTypes.includes(file.type);
}

// =============================================
// FORMAT BYTES KE MB
// =============================================
function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// =============================================
// HANDLE FILE INPUT
// =============================================
document.addEventListener('DOMContentLoaded', function() {
    // File inputs untuk foto
    const fotoInputs = document.querySelectorAll('input[type="file"]');
    
    fotoInputs.forEach(input => {
        input.addEventListener('change', function(e) {
            const file = this.files[0];
            const fileLabel = this.nextElementSibling;
            const fileInfo = fileLabel ? fileLabel.querySelector('.file-info') : null;
            const errorDiv = this.nextElementSibling ? this.nextElementSibling.querySelector('.error-message') : null;

            if (file) {
                // Validasi tipe file
                if (!validateFileType(file)) {
                    if (errorDiv) {
                        errorDiv.textContent = 'Tipe file tidak valid. Gunakan JPG, PNG, atau GIF';
                        errorDiv.style.display = 'block';
                    }
                    this.value = '';
                    return;
                }

                // Validasi ukuran file
                if (!validateFileSize(file, 3)) {
                    if (errorDiv) {
                        errorDiv.textContent = 'Ukuran file terlalu besar. Maksimal 3MB (File: ' + formatBytes(file.size) + ')';
                        errorDiv.style.display = 'block';
                    }
                    this.value = '';
                    return;
                }

                // Tampilkan info file
                if (fileInfo) {
                    fileInfo.textContent = 'File: ' + file.name + ' (' + formatBytes(file.size) + ')';
                    fileInfo.style.color = '#27ae60';
                }

                // Sembunyikan error
                if (errorDiv) {
                    errorDiv.style.display = 'none';
                }

                // Preview gambar
                const reader = new FileReader();
                reader.onload = function(e) {
                    // Cari img preview di dalam label
                    let imgPreview = fileLabel.querySelector('img');
                    if (!imgPreview) {
                        imgPreview = document.createElement('img');
                        imgPreview.style.maxWidth = '200px';
                        imgPreview.style.marginTop = '10px';
                        fileLabel.appendChild(imgPreview);
                    }
                    imgPreview.src = e.target.result;
                };
                reader.readAsDataURL(file);
            }
        });
    });

    // Form submission
    const form = document.querySelector('form');
    if (form) {
        form.addEventListener('submit', function(e) {
            const formData = new FormData(this);
            const errors = validateCheckoutForm(Object.fromEntries(formData));

            if (errors.length > 0) {
                e.preventDefault();
                
                // Hapus error sebelumnya
                const oldErrors = document.querySelectorAll('.alert-danger');
                oldErrors.forEach(el => el.remove());

                // Tampilkan error baru
                const errorDiv = document.createElement('div');
                errorDiv.className = 'alert alert-danger';
                errorDiv.innerHTML = '<strong>Ada Kesalahan:</strong><ul>' + 
                    errors.map(err => '<li>' + err + '</li>').join('') + 
                    '</ul>';
                
                form.insertBefore(errorDiv, form.firstChild);
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        });
    }
});
