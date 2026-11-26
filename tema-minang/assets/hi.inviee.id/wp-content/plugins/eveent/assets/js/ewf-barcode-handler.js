(function($) {
    'use strict';

    
    var EwfBarcodeHandler = function($scope, $) {
        
        var $trigger = $scope.find('.ewf-barcode-trigger');
        var $modal = $scope.find('.ewf-barcode-modal-wrapper');
        var $closeButton = $modal.find('.ewf-barcode-modal-close');
        var $barcodeWrapper = $modal.find('.ewf-barcode-wrapper');
        var $downloadButton = $modal.find('.ewf-download-button');
        var $guestNameElement = $modal.find('.ewf-content-left .guest-name'); 

        if (!$trigger.length || !$modal.length || !$barcodeWrapper.length || !$guestNameElement.length) {
            return;
        }

        
        $trigger.on('click', function(e) {
            e.preventDefault();
            $modal.css('display', 'flex');
            setTimeout(function() {
                $modal.addClass('is-visible');
            }, 10);
        });

        function closeModal() {
            $modal.removeClass('is-visible');
            setTimeout(function() {
                $modal.css('display', 'none');
            }, 300);
        }

        $closeButton.on('click', closeModal);
        $modal.on('click', function(e) {
            if ($(e.target).is($modal)) {
                closeModal();
            }
        });

       
        var qrUrl = $barcodeWrapper.data('url');
        if (qrUrl && typeof QRCode !== 'undefined') {
            $barcodeWrapper.empty();
            new QRCode($barcodeWrapper.get(0), {
                text: qrUrl,
                width: 120,
                height: 120,
                colorDark: '#000000',
                colorLight: '#FFFFFF',
                correctLevel: QRCode.CorrectLevel.H
            });
        }

       
        if ($downloadButton.length && typeof html2canvas !== 'undefined') {
            $downloadButton.on('click', function(e) {
                e.preventDefault();

                var urlParams = new URLSearchParams(window.location.search);
                var guestName = urlParams.has('to') ? decodeURIComponent(urlParams.get('to').replace(/\+/g, ' ')) : $guestNameElement.text().trim();
                
                var fileName = 'barcode_' + guestName.trim().replace(/\s+/g, '_').toLowerCase() + '.png';
                var barcodeElement = $barcodeWrapper.get(0);
                
              
                var textPrefix = 'QR Code untuk:';
                var fontSizePrefix = 12; 
                var fontSizeName = 12; 
                var textColor = '#333';
                var paddingTop = 20;     
                var lineSpacing = 5;   

                if (barcodeElement) {
                    html2canvas(barcodeElement, { useCORS: true, background: null }).then(function(barcodeCanvas) {
                        var padding = 20;
                        
                        
                        var tempCtx = document.createElement('canvas').getContext('2d');
                        tempCtx.font = fontSizeName + 'px sans-serif';
                        var textWidth = tempCtx.measureText(guestName).width;

                        
                        var finalCanvasWidth = Math.max(barcodeCanvas.width + (padding * 2), textWidth + (padding * 2));
                        var finalCanvasHeight = barcodeCanvas.height + (padding * 2) + paddingTop + fontSizePrefix + lineSpacing + fontSizeName;
                        
                        var finalCanvas = document.createElement('canvas');
                        finalCanvas.width = finalCanvasWidth;
                        finalCanvas.height = finalCanvasHeight;
                        var ctx = finalCanvas.getContext('2d');

                        ctx.fillStyle = 'white';
                        ctx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);
                        
                        
                        var barcodeX = (finalCanvas.width - barcodeCanvas.width) / 2;
                        ctx.drawImage(barcodeCanvas, barcodeX, padding);

                        
                        ctx.font = fontSizePrefix + 'px sans-serif';
                        ctx.fillStyle = textColor;
                        ctx.textAlign = 'center';
                        ctx.fillText(textPrefix, finalCanvas.width / 2, barcodeCanvas.height + padding + paddingTop);

                       
                        ctx.font = 'bold ' + fontSizeName + 'px sans-serif'; 
                        ctx.fillText(guestName, finalCanvas.width / 2, barcodeCanvas.height + padding + paddingTop + fontSizePrefix + lineSpacing);

                        var link = document.createElement('a');
                        link.href = finalCanvas.toDataURL('image/png');
                        link.download = fileName;

                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);

                    }).catch(function(error) {
                        console.error('Oops, something went wrong!', error);
                        alert('Gagal membuat gambar barcode. Silakan coba lagi.');
                    });
                }
            });
        }

        if ($trigger.hasClass('ev-hide-on-scroll')) {
            var scrollTimeout;
            window.addEventListener('scroll', function(e) {
                if ($trigger[0] === e.target || $trigger[0].contains(e.target)) return;

                if (!$trigger.hasClass('ev-is-scrolling')) {
                    $trigger.addClass('ev-is-scrolling');
                }
                clearTimeout(scrollTimeout);
                scrollTimeout = setTimeout(function() {
                    $trigger.removeClass('ev-is-scrolling');
                }, 500);
            }, true);
        }
    };

    
    $(window).on('elementor/frontend/init', function() {
        elementorFrontend.hooks.addAction('frontend/element_ready/ewf-barcode.default', EwfBarcodeHandler);
    });

})(jQuery);