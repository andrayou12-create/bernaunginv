jQuery(function ($) {
    'use strict';

    function escAttr(s) {
        return String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;')
                        .replace(/'/g,'&#39;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    }

    function handleAttendanceChange() {
        var guestField = $('.ev-rsvp-guest-field').first();
        var detailedAttendanceWrapper = $('.ev-rsvp-detailed-attendance-wrapper');
        var isPresentChecked = $('input[name="attendance"][value="present"]').is(':checked');

        if (isPresentChecked) {
            guestField.slideDown(200);
            detailedAttendanceWrapper.addClass('active');
        } else {
            guestField.slideUp(200);
            detailedAttendanceWrapper.removeClass('active');
        }
    }

    function init() {
        var wrapper = $('.ev-rsvp-wrapper').not('.ev-comment-widget-mode');
        if (!wrapper.length) return;

        var hideInitials = wrapper.data('hide-initial-name');
        var hideBadges = wrapper.data('hide-attendance-badge');

        if (hideInitials === 'yes') {
            wrapper.addClass('ev-rsvp-hide-initials');
        }
        if (hideBadges === 'yes') {
            wrapper.addClass('ev-rsvp-hide-badges');
        }
    }
    init();

    function handleGuestName() {
        const guestNameInput = $('#author');
        if (!guestNameInput.length) return;

        const urlParams = new URLSearchParams(window.location.search);
        
        
        const paramName = $('.ev-rsvp-wrapper').data('url-param') || 'to';
        const guestNameFromUrl = urlParams.get(paramName);
        const isGroupInvite = urlParams.has('group');

        if (isGroupInvite) {
            return;
        }

        if (guestNameFromUrl) {
            const cleanedName = decodeURIComponent(guestNameFromUrl.replace(/\+/g, ' ')).trim();
            const placeholderNames = ['nama tamu', 'tamu undangan'];

            if (placeholderNames.includes(cleanedName.toLowerCase())) {
                guestNameInput.val('');
                guestNameInput.prop('readonly', false);
            } else {
                guestNameInput.val(cleanedName);
            }
        }
    }
    handleGuestName();

    function handleGuestCount() {
        const urlParams = new URLSearchParams(window.location.search);
        const guestCountFromUrl = parseInt(urlParams.get('guest'), 10);
        
        if (guestCountFromUrl && guestCountFromUrl > 0) {
            const guestSelect = $('#guest, #guest-preview');
            if (guestSelect.length) {
                let optionSuffix = 'Orang';
                const firstOptionText = guestSelect.find('option').first().text();
                if (firstOptionText) {
                    optionSuffix = firstOptionText.replace(/^\d+\s*/, '') || 'Orang';
                }
                
                guestSelect.empty();
                for (let i = 1; i <= guestCountFromUrl; i++) {
                    guestSelect.append($('<option>', {
                        value: i,
                        text: i + ' ' + optionSuffix
                    }));
                }
                
                guestSelect.val(guestCountFromUrl);
            }
        }
    }
    handleGuestCount();

    $('input[name="attendance"]').on('change', function () {
        var $form = $(this).closest('.ev-rsvp-form');
        var $guestField = $form.find('.ev-rsvp-guest-field').first();
        var $detailedAttendance = $form.find('.ev-rsvp-detailed-attendance-wrapper');

        if ($(this).val() === 'present') {
            $guestField.slideDown(200);
            if ($detailedAttendance.length) {
                $detailedAttendance.slideDown(200).addClass('active');
            }
        } else {
            $guestField.slideUp(200);
            if ($detailedAttendance.length) {
                $detailedAttendance.slideUp(200).removeClass('active');
            }
        }
    });

    // ── Sticker Carousel ──────────────────────────────
    function initStickerCarousel($modal) {
        var $track = $modal.find('.ev-rsvp-sticker-carousel-track');
        if (!$track.length || $track.data('carousel-init')) return;
        $track.data('carousel-init', true);

        var perPage = parseInt($track.data('items-per-page')) || 8;
        var $items = $track.children('.ev-rsvp-modal-sticker-option');
        if ($items.length === 0) return;

        // Chunk items into pages
        var totalPages = Math.ceil($items.length / perPage);
        $items.detach();
        for (var p = 0; p < totalPages; p++) {
            var $page = $('<div class="ev-rsvp-sticker-page"></div>');
            var start = p * perPage;
            var end = Math.min(start + perPage, $items.length);
            for (var i = start; i < end; i++) {
                $page.append($items.eq(i));
            }
            $track.append($page);
        }

        // Build nav
        var $nav = $modal.find('.ev-rsvp-sticker-carousel-nav');
        if (totalPages <= 1) { $nav.hide(); return; }

        var navHTML = '<button type="button" class="ev-rsvp-sticker-nav-btn" data-dir="prev"><svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"></polyline></svg></button>';
        navHTML += '<div class="ev-rsvp-sticker-dots">';
        for (var d = 0; d < totalPages; d++) {
            navHTML += '<button type="button" class="ev-rsvp-sticker-dot' + (d === 0 ? ' active' : '') + '" data-page="' + d + '"></button>';
        }
        navHTML += '</div>';
        navHTML += '<button type="button" class="ev-rsvp-sticker-nav-btn" data-dir="next"><svg viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"></polyline></svg></button>';
        $nav.html(navHTML).show();

        var currentPage = 0;
        function goToPage(pg) {
            if (pg < 0 || pg >= totalPages) return;
            currentPage = pg;
            $track.css('transform', 'translateX(-' + (pg * 100) + '%)');
            $nav.find('.ev-rsvp-sticker-dot').removeClass('active').eq(pg).addClass('active');
            $nav.find('[data-dir="prev"]').prop('disabled', pg === 0);
            $nav.find('[data-dir="next"]').prop('disabled', pg === totalPages - 1);
        }
        goToPage(0);

        $nav.on('click', '.ev-rsvp-sticker-nav-btn', function () {
            var dir = $(this).data('dir');
            goToPage(dir === 'prev' ? currentPage - 1 : currentPage + 1);
        });
        $nav.on('click', '.ev-rsvp-sticker-dot', function () {
            goToPage(parseInt($(this).data('page')));
        });

        // Touch swipe support
        var touchStartX = 0, touchEndX = 0;
        $track.closest('.ev-rsvp-sticker-carousel')[0].addEventListener('touchstart', function (e) {
            touchStartX = e.changedTouches[0].screenX;
        }, { passive: true });
        $track.closest('.ev-rsvp-sticker-carousel')[0].addEventListener('touchend', function (e) {
            touchEndX = e.changedTouches[0].screenX;
            var diff = touchStartX - touchEndX;
            if (Math.abs(diff) > 40) {
                goToPage(diff > 0 ? currentPage + 1 : currentPage - 1);
            }
        }, { passive: true });
    }

    $('#ev-rsvp-sticker-trigger').on('click', function () {
        var $overlay = $('.ev-rsvp-sticker-modal-overlay').not('.ev-comment-sticker-modal-overlay');
        $overlay.addClass('active');
        initStickerCarousel($overlay.find('.ev-rsvp-sticker-modal'));
    });

    $('body').on('click', '.ev-rsvp-sticker-modal-overlay', function (e) {
        if ($(e.target).is('.ev-rsvp-sticker-modal-overlay')) {
            $(this).removeClass('active');
        }
    });

    $('body').on('click', '.ev-rsvp-sticker-modal-close', function () {
        $(this).closest('.ev-rsvp-sticker-modal-overlay').removeClass('active');
    });

    $('body').on('click', '.ev-rsvp-sticker-modal', function (e) {
        e.stopPropagation();
    });

    // Anti-download protection: disable right-click on sticker images
    $('body').on('contextmenu', '.ev-rsvp-sticker-modal img, .ev-rsvp-comment-sticker img', function (e) {
        e.preventDefault();
        return false;
    });

    // Anti-download protection: disable drag on sticker images
    $('body').on('dragstart', '.ev-rsvp-sticker-modal img, .ev-rsvp-comment-sticker img', function (e) {
        e.preventDefault();
        return false;
    });

    $('body').on('click', '.ev-rsvp-modal-sticker-option', function () {
        var $this = $(this);
        var stickerType = $this.data('sticker-type');
        var stickerValue = $this.data('sticker-value');
        var stickerData = { type: stickerType, value: stickerValue };
        
        $('#selected_sticker').val(JSON.stringify(stickerData));

        // Highlight selected sticker (clear ALL across pages)
        $this.closest('.ev-rsvp-sticker-modal').find('.ev-rsvp-modal-sticker-option').removeClass('selected');
        $this.addClass('selected');

        if (stickerType === 'icon') {
            $('#ev-rsvp-sticker-preview').html(`<i class="${escAttr(stickerValue)}"></i>`);
        } else {
            $('#ev-rsvp-sticker-preview').html(`<img src="${escAttr(stickerValue)}" width="100" height="100" draggable="false" oncontextmenu="return false">`);
        }

        $('.ev-rsvp-sticker-modal-overlay').removeClass('active');
    });

    $('#comment').on('focus', function () {
        $('#selected_sticker').val('');
        $('#ev-rsvp-sticker-preview').html('');
    });

    function buildReplyHTML(replyObject) {
        var badgeText = $('.ev-rsvp-wrapper').data('reply-badge-text') || 'Pengguna';
        var avatarUrl = $('.ev-rsvp-wrapper').data('reply-avatar-url') || replyObject.avatar;
        var replyClass = 'ev-rsvp-public-reply';

        return `
            <div class="${replyClass}">
                <div class="ev-rsvp-reply-avatar"><img src="${avatarUrl}" alt="" width="32" height="32"></div>
                <div class="ev-rsvp-reply-bubble">
                    <div class="ev-rsvp-reply-header">
                        <span class="ev-rsvp-reply-author">${replyObject.author}</span>
                        <span class="ev-rsvp-reply-badge">${badgeText}</span>
                    </div>
                    <div class="ev-rsvp-reply-body">${replyObject.content}</div>
                    <div class="ev-rsvp-reply-footer">
                        <time class="ev-rsvp-reply-comment-time">${replyObject.time_ago}</time>
                    </div>
                </div>
            </div>
        `;
    }

    function updateLikeButtons() {
        var likedComments = JSON.parse(localStorage.getItem('ev_rsvp_liked_comments')) || [];
        $('.ev-rsvp-like-button').each(function () {
            var button = $(this);
            var commentId = button.data('comment-id');
            if (likedComments.includes(commentId)) {
                button.addClass('liked').prop('disabled', true);
            }
        });
    }

    function loadComments(page, retryCount) {
        var container = $('.ev-rsvp-list-container');
        if (!container.length) return;

        if (container.closest('.ev-comment-widget-mode').length > 0) {
            return; 
        }

        var listWrapper = container.closest('.ev-rsvp-list-wrapper');
        var wrapper = container.closest('.ev-rsvp-wrapper');
        var isPagination = container.attr('data-pagination') === 'yes';
        var perPage = parseInt(container.data('per-page')) || 5;
        var link = container.data('link');
        var loader = container.find('.ev-rsvp-loader');
        retryCount = retryCount || 0;
        
        page = page || 1;

        if (!link) return;

        loader.show();
        var navContainer = wrapper.find('.ev-rsvp-pagination-nav');
        if(navContainer.length) navContainer.hide();

        $.ajax({
            url: EvGlobal.ajaxurl,
            type: 'POST',
            dataType: 'json',
            timeout: 15000,
            data: {
                action: 'ev_get_comments',
                nonce: EvRSVP.nonce,
                post_id: new URLSearchParams(link).get('post_id'),
                paged: page,
                number: perPage,
                badge_present_text: wrapper.data('badge-present-text'),
                badge_notpresent_text: wrapper.data('badge-notpresent-text'),
                badge_notsure_text: wrapper.data('badge-notsure-text'),
            },
            success: function (response) {
                var navContainer = wrapper.find('.ev-rsvp-pagination-nav');
                if(navContainer.length) navContainer.remove(); // Remove old pagination cleanly
                loader.hide();

                if (response.success && response.data.comments && response.data.comments.length > 0) {
                    var comments = response.data.comments;
                    var meta = response.data.meta || {};

                    // Always sync count from server (bypasses page cache)
                    var countEl = wrapper.find('.ev-rsvp-count');
                    if (countEl.length && meta.total !== undefined) {
                        countEl.text(meta.total);
                    }
                    
                    var tempHTML = '';
                    var renderedAny = false;
                    $.each(comments, function (index, comment) {
                        var html = buildCommentHTML(comment);
                        if (html !== '') {
                            tempHTML += html;
                            renderedAny = true;
                        }
                    });

                    if (renderedAny) {
                        container.empty();
                        container.append(tempHTML);
                        updateLikeButtons();

                        if (isPagination) {
                            var currentPage = parseInt(meta.current_page);
                            var total = parseInt(meta.total) || 0;
                            var maxPages = Math.max(1, Math.ceil(total / perPage));
                            
                            // Only show pagination when there are genuinely multiple pages
                            if (maxPages > 1) {
                                var navHTML = '<div class="ev-rsvp-pagination-nav">';
                            
                                // Prev button (SVG chevron-left)
                                if (currentPage > 1) {
                                    navHTML += '<button class="ev-rsvp-page-btn prev" data-target-page="' + (currentPage - 1) + '" aria-label="Halaman sebelumnya"><svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"></polyline></svg></button>';
                                } else {
                                    navHTML += '<button class="ev-rsvp-page-btn prev disabled" disabled aria-label="Halaman sebelumnya"><svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"></polyline></svg></button>';
                                }

                                // Page number buttons with smart ellipsis
                                var pages = [];
                                if (maxPages <= 7) {
                                    for (var i = 1; i <= maxPages; i++) pages.push(i);
                                } else {
                                    pages.push(1);
                                    if (currentPage > 3) pages.push('...');
                                    var start = Math.max(2, currentPage - 1);
                                    var end = Math.min(maxPages - 1, currentPage + 1);
                                    for (var i = start; i <= end; i++) pages.push(i);
                                    if (currentPage < maxPages - 2) pages.push('...');
                                    pages.push(maxPages);
                                }

                                for (var p = 0; p < pages.length; p++) {
                                    if (pages[p] === '...') {
                                        navHTML += '<span class="ev-rsvp-page-ellipsis">…</span>';
                                    } else {
                                        var activeClass = pages[p] === currentPage ? ' active' : '';
                                        navHTML += '<button class="ev-rsvp-page-btn page-num' + activeClass + '" data-target-page="' + pages[p] + '">' + pages[p] + '</button>';
                                    }
                                }

                                // Next button (SVG chevron-right)
                                if (currentPage < maxPages) {
                                    navHTML += '<button class="ev-rsvp-page-btn next" data-target-page="' + (currentPage + 1) + '" aria-label="Halaman selanjutnya"><svg viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"></polyline></svg></button>';
                                } else {
                                    navHTML += '<button class="ev-rsvp-page-btn next disabled" disabled aria-label="Halaman selanjutnya"><svg viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"></polyline></svg></button>';
                                }

                                navHTML += '</div>';
                                listWrapper.after(navHTML);
                            }
                        }
                    } else {
                        showEmptyFeedbackAndRestoreRsvpPagination(page);
                    }
                } else {
                    if (page === 1) {
                         // Sync count to 0 (bypasses page cache)
                         var countEl = wrapper.find('.ev-rsvp-count');
                         if (countEl.length) countEl.text('0');

                         container.empty().html(`
                            <div class="ev-rsvp-no-comments combined">
                                <div class="icon-wrapper">
                                   <i class="fas fa-envelope-open-text"></i>
                                </div>
                                <h3>Belum Ada Ucapan</h3>
                                <p>Jadilah yang pertama memberikan Ucapan.</p>
                                <button class="cta-button" onclick="document.getElementById('author').focus()">Tulis Ucapan</button>
                            </div>
                        `);
                    } else {
                        showEmptyFeedbackAndRestoreRsvpPagination(page);
                    }
                }
            },
            error: function () {
                // Auto-retry once before showing error (handles stale nonce from cached pages)
                if (retryCount < 1) {
                    setTimeout(function() {
                        loadComments(page, retryCount + 1);
                    }, 1500);
                    return;
                }
                container.html('<p style="text-align:center;">Gagal memuat ucapan (Koneksi Error).</p>');
                loader.hide();
            },
        });

        // Helper to solve the empty next page UX issue
        function showEmptyFeedbackAndRestoreRsvpPagination(failedPage) {
            Swal.fire({
                icon: 'info',
                title: 'Selesai',
                text: 'Tidak ada ucapan berikutnya yang tersedia.',
                timer: 2000,
                showConfirmButton: false,
                customClass: { popup: 'ev-rsvp-swal' }
            });
            var goBackTo = Math.max(1, failedPage - 1);
            if (goBackTo > 0) {
                setTimeout(function() {
                    window.evLoadRsvpPage(goBackTo);
                }, 500);
            }
        }
    }

    $(document).on('click', '.ev-rsvp-page-btn:not(.disabled)', function (e) {
        e.preventDefault();
        var targetPage = $(this).data('target-page');
        if (!targetPage) return;
        
        // Smooth scroll to list top on page change
        var listContainer = $('.ev-rsvp-list-container');
        if (listContainer.length) {
            var offset = listContainer.offset().top - 80;
            $('html, body').animate({ scrollTop: offset }, 300);
        }
        
        loadComments(targetPage);
    });

    loadComments(1);

    $('#ev-rsvp-form').on('submit', function (e) {
        e.preventDefault();

        var wrapper = $('.ev-rsvp-wrapper');
        var isGuestNameRequired = wrapper.data('guest-name-required');
        var isAttendanceDisabled = wrapper.data('attendance-disabled') === 'yes';
        var urlParams = new URLSearchParams(window.location.search);
        var guestId = urlParams.get('id');

        if (isGuestNameRequired === 'yes' && !guestId) {
            Swal.fire({
                icon: 'error',
                title: 'Gagal Terkirim',
                text: 'Maaf, hanya nama tamu yang telah terdaftar yang bisa memberikan ucapan ini.',
                showConfirmButton: false,
                timer: 4000,
                timerProgressBar: true,
                showClass: { popup: 'animate__animated animate__zoomIn animate__faster' },
                hideClass: { popup: 'animate__animated animate__zoomOut animate__faster' }
            });
            return;
        }

        function showWarning(message) {
            Swal.fire({
                icon: 'warning',
                title: 'Perhatian!',
                text: message,
                showConfirmButton: false,
                timer: 3000,
                timerProgressBar: true,
                showClass: { popup: 'animate__animated animate__zoomIn animate__faster' },
                hideClass: { popup: 'animate__animated animate__zoomOut animate__faster' }
            });
        }

        var nameInput = $('#author');
        var attendanceInput = $('input[name="attendance"]:checked');

        if (nameInput.val().trim() === '') {
            showWarning('Mohon isi nama Anda terlebih dahulu.');
            return;
        }

        if (!isAttendanceDisabled) {
            if (attendanceInput.length === 0) {
                showWarning('Mohon konfirmasi kehadiran Anda terlebih dahulu.');
                return;
            }
        }

        var detailedAttendanceWrapper = $('.ev-rsvp-detailed-attendance-wrapper');
        if (detailedAttendanceWrapper.length > 0 && attendanceInput.val() === 'present') {
            var checkedEvents = $('input[name="detailed_attendance[]"]:checked');
            if (checkedEvents.length === 0) {
                showWarning('Mohon pilih minimal satu acara yang akan Anda hadiri.');
                return;
            }
        }

        var form = $(this);
        
        var stickerInput = $('#selected_sticker');
        var commentInput = $('#comment');

        var stickerValue = stickerInput.length ? stickerInput.val().trim() : '';
        var commentValue = commentInput.length ? commentInput.val().trim() : '';

        var spamPattern = /<[a-z][\s\S]*>|((http|https):\/\/|www\.)|on\w*=/i;
        
        if (spamPattern.test(commentValue)) {
            showWarning('Ups, sepertinya ada tautan/link di ucapanmu. Mohon untuk tidak menyertakannya ya, demi keamanan bersama. Terima kasih!');
            return;
        }
        var maxChars = 500;
        if (commentValue.length > maxChars) {
            showWarning(`Wah, ucapannya panjang sekali! Mohon dipersingkat ya, maksimal ${maxChars} karakter.`);
            return;
        }

        var button = form.find('.ev-rsvp-submit-button');
        button.prop('disabled', true).addClass('is-loading');

        var formData = form.serializeArray();
        
        // Explicitly collect detailed_attendance checkboxes (serializeArray may miss them 
        // if wrapper was initially hidden or if $.param encoding strips array brackets)
        formData = formData.filter(function(item) {
            return item.name !== 'detailed_attendance[]';
        });
        $('input[name="detailed_attendance[]"]:checked').each(function() {
            formData.push({ name: 'detailed_attendance[]', value: $(this).val() });
        });
        
        formData.push({ name: 'enable_wa_notice', value: form.data('enable-wa-notice') });
        formData.push({ name: 'wa_notice_name', value: form.data('wa-notice-name') });
        formData.push({ name: 'wa_notice_number', value: form.data('wa-notice-number') });
        formData.push({ name: 'wa_template', value: form.data('wa-template') });
        formData.push({ name: 'is_guest_name_required', value: isGuestNameRequired });
        
        formData.push({ name: 'badge_present_text', value: wrapper.data('badge-present-text') });
        formData.push({ name: 'badge_notpresent_text', value: wrapper.data('badge-notpresent-text') });
        formData.push({ name: 'badge_notsure_text', value: wrapper.data('badge-notsure-text') });

        if (isAttendanceDisabled) {
            formData.push({ name: 'attendance', value: '' });
        }

        if (guestId) {
            formData.push({ name: 'guest_id', value: guestId });
        }
        formData.push({ name: 'action', value: 'ev_insert_comment' }, { name: 'nonce', value: EvRSVP.nonce }, { name: 'commentpress', value: '1' });

        $.ajax({
            url: EvGlobal.ajaxurl,
            type: 'POST',
            dataType: 'json',
            data: $.param(formData),
            success: function (response) {
                if (response.success) {
                    if ($('.ev-rsvp-no-comments').length) {
                        $('.ev-rsvp-list-container').html('');
                    }

                    var existingItems = $("[id='comment-item-" + response.data.comment_id + "']");
                    var listContainer = $('.ev-rsvp-list-container, .ev-comment-list-container');
                    
                    var newCommentHTML = buildCommentHTML(response.data);
                    
                    if (newCommentHTML === '') {
                        if (existingItems.length > 0) {
                            existingItems.fadeOut(300, function(){ $(this).remove(); });
                        }
                    } else {
                        if (existingItems.length > 0) {
                            existingItems.replaceWith(newCommentHTML);
                        } else {
                            var newCommentEl = $(newCommentHTML);
                            newCommentEl.css('opacity', 0);
                            listContainer.prepend(newCommentEl);
                            newCommentEl.animate({ opacity: 1 }, 500);
                        }
                    }

                    
                    if (commentValue !== '' || stickerValue !== '') {
                        var countEl = $('.ev-rsvp-count');
                        var currentCount = parseInt(countEl.text()) || 0;
                        countEl.text(currentCount + 1);
                    }
                    
                    $(document).trigger('ev_rsvp_submitted', [formData]);

                    form.trigger('reset');
                    $('#ev-rsvp-sticker-preview').html('');
                    $('#selected_sticker').val('');
                    updateLikeButtons();

                    button.addClass('ev-submitted');
                    button.prop('disabled', true);
                    button.removeClass('is-loading');
                    button.css('opacity', '0.6');

                    var swalClass = form.data('swal-class');
                    Swal.fire({
                        icon: 'success',
                        title: 'Terkirim!',
                        text: 'Data Anda berhasil dikirim.',
                        showConfirmButton: false,
                        timer: 2000,
                        timerProgressBar: true,
                        allowOutsideClick: false,
                        customClass: { popup: 'ev-rsvp-swal ' + swalClass }
                    }).then((result) => {
                        // WordPress cron akan berjalan secara native pada request berikutnya.
                        // Tidak perlu trigger manual — notifikasi WA tetap terkirim via scheduled event.
                    });

                } else {
                    var errorMessage = 'Terjadi kesalahan.';
                    if (response.data && typeof response.data.message === 'string') {
                        errorMessage = response.data.message;
                    } else if (typeof response.data === 'string') {
                        errorMessage = response.data;
                    }
                    Swal.fire({
                        icon: 'error',
                        title: 'Gagal Mengirim',
                        text: errorMessage,
                        showConfirmButton: false,
                        timer: 4000,
                        timerProgressBar: true
                    });
                }
            },
            error: function () {
                Swal.fire({
                    icon: 'error',
                    title: 'Oops...',
                    text: 'Terjadi kesalahan koneksi.',
                    showConfirmButton: false,
                    timer: 3000,
                    timerProgressBar: true
                });
            },
            complete: function () {
                if (!button.hasClass('ev-submitted')) {
                    button.prop('disabled', false).removeClass('is-loading');
                }
            }
        });
    });

    $('.ev-rsvp-list-container').on('click', '.ev-rsvp-like-button', function () {
        var button = $(this);
        var commentId = button.data('comment-id');

        if (button.prop('disabled')) return;

        button.prop('disabled', true);

        var likedComments = JSON.parse(localStorage.getItem('ev_rsvp_liked_comments')) || [];
        var isAlreadyLikedInStorage = likedComments.includes(commentId);

        if (isAlreadyLikedInStorage) return;

        button.addClass('liking');

        var countSpan = button.find('.ev-rsvp-like-count');
        var currentCount = parseInt(countSpan.text());
        button.addClass('liked');
        countSpan.text(currentCount + 1);

        likedComments.push(commentId);
        localStorage.setItem('ev_rsvp_liked_comments', JSON.stringify(likedComments));

        $.ajax({
            url: EvGlobal.ajaxurl,
            type: 'POST',
            data: {
                action: 'ev_rsvp_toggle_like',
                nonce: EvRSVP.nonce,
                comment_id: commentId,
                liked: false
            },
            success: function (response) {
                if (response.success) {
                    countSpan.text(response.data.new_count);
                }
            },
            complete: function () {
                button.removeClass('liking');
            }
        });
    });

    var modalHTML = `<div class="ev-rsvp-reply-modal-overlay"><div class="ev-rsvp-reply-modal"><h4>Pesan Balasan</h4><div class="ev-rsvp-modal-error"></div>
    <form id="ev-rsvp-public-reply-form">
    <div class="ev-rsvp-field"><label for="reply_author_name">Nama Anda</label><input type="text" id="reply_author_name" required></div>
    <div class="ev-rsvp-field"><label for="reply_content">Pesan</label><textarea id="reply_content" rows="3" required></textarea></div>
    <div class="ev-rsvp-field"><label for="reply_password">Password</label><input type="password" id="reply_password" required></div>
    <div class="ev-rsvp-reply-modal-actions"><button type="button" class="ev-rsvp-modal-cancel">Batal</button><button type="submit" class="ev-rsvp-modal-submit">Kirim Balasan</button></div>
    </form></div></div>`;
    
    $('body').append(modalHTML);
    var currentParentId = 0;

    $('.ev-rsvp-list-container').on('click', '.ev-rsvp-reply-button', function (e) {
        e.preventDefault();
        currentParentId = $(this).data('comment-id');
        $('#reply_password').closest('.ev-rsvp-field').show();
        $('#reply_author_name').closest('.ev-rsvp-field').show();
        $('.ev-rsvp-reply-modal-overlay').addClass('active');
    });

    $('.ev-rsvp-modal-cancel, .ev-rsvp-reply-modal-overlay').on('click', function (e) {
        if ($(e.target).is('.ev-rsvp-modal-cancel') || $(e.target).is('.ev-rsvp-reply-modal-overlay')) {
            $('.ev-rsvp-reply-modal-overlay').removeClass('active');
            $('#ev-rsvp-public-reply-form').trigger('reset');
            $('.ev-rsvp-modal-error').hide();
        }
    });

    $('.ev-rsvp-reply-modal').on('click', function (e) { e.stopPropagation(); });

    $('#ev-rsvp-public-reply-form').on('submit', function (e) {
        e.preventDefault();
        var button = $(this).find('.ev-rsvp-modal-submit'), errorDiv = $('.ev-rsvp-modal-error'), originalButtonText = button.text();
        var action = 'ev_insert_public_reply';
        var data = {
            action: action, nonce: EvRSVP.nonce, post_id: $('#comment_post_ID').val(),
            parent_id: currentParentId, password: $('#reply_password').val(),
            author_name: $('#reply_author_name').val(), reply_content: $('#reply_content').val()
        };
        button.prop('disabled', true).text('Mengirim...'); errorDiv.hide();
        $.ajax({
            url: EvGlobal.ajaxurl, type: 'POST', dataType: 'json', data: data,
            success: function (response) {
                if (response.success) {
                    var newReplyHTML = buildReplyHTML(response.data);
                    var newReply = $(newReplyHTML); newReply.css('opacity', 0);
                    
                    var commentItem = $('#comment-item-' + currentParentId);
                    var repliesWrapper = commentItem.find('.ev-rsvp-replies-wrapper');
                    if (repliesWrapper.length === 0) {
                        repliesWrapper = $('<div class="ev-rsvp-replies-wrapper"></div>');
                        commentItem.append(repliesWrapper);
                    }
                    repliesWrapper.append(newReply);
                    
                    newReply.animate({ opacity: 1 }, 500);
                    $('.ev-rsvp-reply-modal-overlay').removeClass('active');
                    $('#ev-rsvp-public-reply-form').trigger('reset');
                } else { errorDiv.text(response.data.message || 'Terjadi kesalahan.').show(); }
            },
            error: function () { errorDiv.text('Gagal menghubungi server.').show(); },
            complete: function () { button.prop('disabled', false).text(originalButtonText); }
        });
    });

    function buildCommentHTML(comment) {
        var hasSticker = false;
        var stickerHTML = '';
        if (comment.sticker_html) {
            hasSticker = true;
            stickerHTML += comment.sticker_html;
        } else if (comment.sticker_data && typeof comment.sticker_data === 'object') {
            hasSticker = true;
            stickerHTML += '<div class="ev-rsvp-comment-sticker">';
            if (comment.sticker_data.type === 'svg' || comment.sticker_data.type === 'image') {
                stickerHTML += `<img src="${escAttr(comment.sticker_data.value)}" class="ev-rsvp-sticker-image" alt="Sticker" draggable="false" oncontextmenu="return false">`;
            } else {
                stickerHTML += `<i class="${escAttr(comment.sticker_data.value)}"></i>`;
            }
            stickerHTML += '</div>';
        }

        var hasText = false;
        var bodyHTML = '';
        
        var tempDiv = document.createElement("div");
        tempDiv.innerHTML = comment.content;
        var cleanText = tempDiv.textContent || tempDiv.innerText || "";

        if (comment.content && cleanText.trim() !== '') {
            hasText = true;
            bodyHTML = `<div class="ev-rsvp-comment-body">${comment.content}</div>`;
        }

        if (!hasSticker && !hasText) {
            return '';
        }

        var groupReferenceHTML = '';
        if (comment.group_reference) {
            groupReferenceHTML = `
                <div class="ev-rsvp-group-reference">
                    <span><strong>${comment.group_reference}</strong></span>
                </div>
            `;
        }

        var wrapper = $('.ev-rsvp-wrapper');
        var replyButtonText = wrapper.data('reply-button-text') || 'Balas';
        var enablePublicReply = wrapper.data('public-reply');
        var hideLikeButton = wrapper.data('hide-like-button');

        var hasReplies = comment.replies && comment.replies.length > 0;
        var repliesHTML = '';
        if (hasReplies) {
            repliesHTML = '<div class="ev-rsvp-replies-wrapper">';
            $.each(comment.replies, function (i, reply) {
                repliesHTML += buildReplyHTML(reply);
            });
            repliesHTML += '</div>';
        }

        var likeButtonHTML = '';
        if (hideLikeButton !== 'yes') {
            likeButtonHTML = `<button class="ev-rsvp-like-button" data-comment-id="${comment.comment_id}"><svg xmlns="https://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg><span class="ev-rsvp-like-count">${comment.like_count}</span></button>`;
        }
        
        var replyButtonHTML = '';
        if (enablePublicReply === 'yes') {
            replyButtonHTML = `<button class="ev-rsvp-reply-button" data-comment-id="${comment.comment_id}">${replyButtonText}</button>`;
        }
        
        var avatarHTML = '';
        if (comment.initials) {
            avatarHTML = `<div class="ev-rsvp-comment-avatar ev-rsvp-initials-avatar"><span>${comment.initials}</span></div>`;
        } else {
            avatarHTML = `<div class="ev-rsvp-comment-avatar ev-rsvp-gravatar-avatar"><img src="${comment.avatar}" alt="" width="40" height="40"></div>`;
        }

        return `
            <div class="ev-rsvp-comment-item-wrapper" id="comment-item-${comment.comment_id}">
                <div class="ev-rsvp-comment-item">
                    ${avatarHTML}
                    <div class="ev-rsvp-comment-content-wrapper">
                        <div class="ev-rsvp-comment-header">
                            <div class="ev-rsvp-author-meta">
                                <span class="ev-rsvp-comment-author">${comment.author}</span>
                                ${groupReferenceHTML}
                            </div>
                            ${comment.attendance_tag}
                        </div>
                        ${stickerHTML}
                        ${bodyHTML}
                        <div class="ev-rsvp-comment-footer">
                            <time class="ev-rsvp-comment-time">${comment.time_ago}</time>
                            <div class="ev-rsvp-comment-actions">
                                ${replyButtonHTML}
                                ${likeButtonHTML}
                            </div>
                        </div>
                    </div>
                </div>
                ${repliesHTML}
            </div>`;
    }
});