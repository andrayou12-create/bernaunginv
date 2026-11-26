(function ($) {
    'use strict';

    var EwfDownloadHandler = function ($scope, $) {
        var $invitationButton = $scope.find('.ewf-e-invitation-button');

        if ($invitationButton.length === 0) {
            return;
        }
        
        $invitationButton.data('original-text', $invitationButton.text());

        $invitationButton.on('click', function (e) {
            e.preventDefault();

            var $button = $(this);
            if ($button.hasClass('processing')) {
                return;
            }

            var cardId = $button.data('card-id');
            var fileName = $button.data('filename') || 'e-invitation.png';
            var $cardElement = $('#' + cardId);

            if ($cardElement.length > 0 && typeof html2canvas !== 'undefined') {
                
                var $elementsToHide = $cardElement.find('.ewf-download-button, .ewf-e-invitation-button, .ewf-barcode-modal-close, .ewf-header-button');
                $button.addClass('processing').text('Memproses...');
                $elementsToHide.hide();

               
                var $imageWrapper = $cardElement.find('.ewf-main-image-wrapper');
                var $imageElement = $imageWrapper.find('img');
                var originalImageStyle = $imageElement.attr('style') || ''; 

                if ($imageElement.length > 0) {
                    var containerWidth = $imageWrapper.width();
                    var containerHeight = $imageWrapper.height();
                    var naturalWidth = $imageElement.prop('naturalWidth');
                    var naturalHeight = $imageElement.prop('naturalHeight');

                    var containerRatio = containerWidth / containerHeight;
                    var imageRatio = naturalWidth / naturalHeight;
                    
                   
                    $imageElement.removeAttr('style'); 
                    var newStyles = {};

                    if (imageRatio > containerRatio) {
                       
                        var newWidth = containerHeight * imageRatio;
                        newStyles = {
                            'height': containerHeight + 'px',
                            'width': newWidth + 'px',
                            'margin-left': (containerWidth - newWidth) / 2 + 'px',
                            'margin-top': 0,
                            'max-width': 'none' 
                        };
                    } else {
                       
                        var newHeight = containerWidth / imageRatio;
                        newStyles = {
                            'width': containerWidth + 'px',
                            'height': newHeight + 'px',
                            'margin-top': (containerHeight - newHeight) / 2 + 'px',
                            'margin-left': 0,
                            'max-width': 'none'
                        };
                    }
                    $imageElement.css(newStyles);
                }
              

                setTimeout(function() {
                    html2canvas($cardElement[0], {
                        scale: 2,
                        useCORS: true,
                        logging: false
                    }).then(function (canvas) {
                        var link = document.createElement('a');
                        link.download = fileName;
                        link.href = canvas.toDataURL('image/png');
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                    }).catch(function(error) {
                        console.error('Oops, something went wrong!', error);
                        alert('Gagal membuat gambar. Silakan coba lagi.');
                    }).finally(function() {
                        
                        $elementsToHide.show();
                        $button.removeClass('processing').text($button.data('original-text'));
                       
                        $imageElement.attr('style', originalImageStyle);
                    });
                }, 100);

            } else {
                console.error('Target card element not found or html2canvas is not loaded.');
            }
        });
    };

    $(window).on('elementor/frontend/init', function () {
        elementorFrontend.hooks.addAction('frontend/element_ready/ewf-barcode.default', EwfDownloadHandler);
    });

})(jQuery);