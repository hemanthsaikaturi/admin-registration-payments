// Initialize Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
// Firebase Services
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

// --- FUNCTION TO DISPLAY EVENTS ---
function displayEvents() {
    const eventsListContainer = document.getElementById('events-list-container');
    const eventsTable = document.getElementById('events-table');
    const eventsLoader = document.getElementById('events-list-loader');
    if (!eventsListContainer || !eventsTable || !eventsLoader) return;

    eventsLoader.style.display = 'block';
    eventsTable.style.display = 'none';

    db.collection('events').orderBy('createdAt', 'desc').get().then((querySnapshot) => {
        eventsListContainer.innerHTML = '';
        if (querySnapshot.empty) {
            eventsLoader.innerHTML = '<p>No live events created yet.</p>';
            return;
        }
        querySnapshot.forEach(doc => {
            const event = doc.data();
            const eventId = doc.id;
            const fee = (event.eventFee > 0) ? `₹${event.eventFee}` : 'Free';
            const statusBadge = event.status === 'open' ? `<span class="badge badge-success">Open</span>` : `<span class="badge badge-secondary">Closed</span>`;
            const activeBadge = event.isActive ? `<span class="badge badge-primary">Yes</span>` : `<span class="badge badge-light">No</span>`;
            
            const row = `<tr>
                <td>${event.eventName}</td>
                <td><strong>${fee}</strong></td>
                <td>${statusBadge}</td>
                <td>${activeBadge}</td>
                <td>
                    <div class="action-buttons-container">
                        <a href="registrations.html?eventId=${eventId}" class="btn btn-sm btn-success">View Registrations</a>
                        <a href="admin.html?edit=${eventId}" class="btn btn-sm btn-secondary">Edit</a>
                        <button class="btn btn-sm btn-info activate-btn" data-id="${eventId}" ${event.isActive ? 'disabled' : ''}>Activate</button>
                        <button class="btn btn-sm btn-warning toggle-status-btn" data-id="${eventId}">${event.status === 'open' ? 'Close' : 'Open'}</button>
                    </div>
                </td>
            </tr>`;
            eventsListContainer.innerHTML += row;
        });
        eventsLoader.style.display = 'none';
        eventsTable.style.display = 'table';
        addEventListenersToButtons();
    });
}

function addEventListenersToButtons() {
    document.querySelectorAll('.activate-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            e.target.textContent = "Activating...";
            e.target.disabled = true;
            setActiveEvent(e.target.dataset.id);
        });
    });
    document.querySelectorAll('.toggle-status-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            toggleEventStatus(e.target.dataset.id);
        });
    });
}

async function setActiveEvent(eventIdToActivate) {
    const eventsRef = db.collection('events');
    const batch = db.batch();
    const activeQuery = await eventsRef.where('isActive', '==', true).get();
    activeQuery.forEach(doc => {
        batch.update(doc.ref, { isActive: false });
    });
    const newActiveRef = eventsRef.doc(eventIdToActivate);
    batch.update(newActiveRef, { isActive: true });
    await batch.commit();
    displayEvents();
}

async function toggleEventStatus(eventId) {
    const eventRef = db.collection('events').doc(eventId);
    const doc = await eventRef.get();
    if (doc.exists) {
        const newStatus = doc.data().status === 'open' ? 'closed' : 'open';
        await eventRef.update({ status: newStatus });
        displayEvents();
    }
}

async function displayPastEvents() {
    const pastEventsList = document.getElementById('past-events-list');
    const pastEventsLoader = document.getElementById('past-events-loader');
    if (!pastEventsList || !pastEventsLoader) return;
    pastEventsLoader.style.display = 'block';
    pastEventsList.innerHTML = '';
    const snapshot = await db.collection('pastEvents').orderBy('createdAt', 'desc').get();
    if (snapshot.empty) {
        pastEventsLoader.innerHTML = '<p>No past events added yet.</p>';
        return;
    }
    snapshot.forEach(doc => {
        const event = doc.data();
        const eventId = doc.id;
        const listItem = document.createElement('li');
        listItem.className = 'list-group-item d-flex justify-content-between align-items-center';
        listItem.innerHTML = `<span><img src="${event.posterURL}" width="40" height="40" class="mr-3 rounded" style="object-fit: cover;"><strong>${event.title}</strong> - <em>${event.date}</em></span><button class="btn btn-sm btn-danger delete-past-event-btn" data-id="${eventId}">Delete</button>`;
        pastEventsList.appendChild(listItem);
    });
    pastEventsLoader.style.display = 'none';
    document.querySelectorAll('.delete-past-event-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const eventId = e.target.dataset.id;
            Swal.fire({
                title: 'Are you sure?',
                text: "You won't be able to revert this!",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#d33',
                cancelButtonColor: '#3085d6',
                confirmButtonText: 'Yes, delete it!'
            }).then((result) => {
                if (result.isConfirmed) {
                    deletePastEvent(eventId);
                }
            });
        });
    });
}

async function deletePastEvent(eventId) {
    try {
        await db.collection('pastEvents').doc(eventId).delete();
        Swal.fire('Deleted!', 'The past event has been removed.', 'success');
        displayPastEvents();
    } catch (error) {
        console.error("Error deleting past event: ", error);
        Swal.fire('Error!', 'Could not delete the event.', 'error');
    }
}

function populateCustomQuestions(containerId, questions) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    if (questions && questions.length > 0) {
        questions.forEach(q => {
            const newQuestionHTML = `<div class="border p-2 mb-2 rounded bg-light">
                <div class="form-row align-items-center">
                    <div class="col-md-7"><input type="text" class="form-control form-control-sm" data-type="label" value="${q.label}" required></div>
                    <div class="col-md-4"><select class="form-control form-control-sm" data-type="type" value="${q.type}"><option value="text">Text Answer</option><option value="yesno">Yes / No</option><option value="rating">Rating (1-10)</option></select></div>
                    <div class="col-md-1 text-right"><button type="button" class="btn btn-sm btn-danger" onclick="this.closest('.border').remove()">X</button></div>
                </div></div>`;
            container.insertAdjacentHTML('beforeend', newQuestionHTML);
            container.querySelector('.border:last-child [data-type="type"]').value = q.type;
        });
    }
}

async function populateFormForEdit(eventId) {
    try {
        const docRef = db.collection('events').doc(eventId);
        const doc = await docRef.get();
        if (!doc.exists) {
            alert('Error: Event not found.');
            window.location.href = 'admin.html';
            return;
        }
        const event = doc.data();

        document.getElementById('eventName').value = event.eventName || '';
        document.getElementById('eventDescription').value = event.description || '';
        if (event.posterURL) {
            document.getElementById('current-poster-container').style.display = 'block';
            document.getElementById('current-poster-img').src = event.posterURL;
        }

        const eventAudienceSelect = document.getElementById('eventAudience');
        eventAudienceSelect.value = event.eventAudience || 'students_only';
        eventAudienceSelect.dispatchEvent(new Event('change'));

        const participationSelect = document.getElementById('participationType');
        participationSelect.value = event.participationType || 'individual';
        participationSelect.dispatchEvent(new Event('change'));

        if (event.participationType === 'team') {
            const isRange = event.minTeamSize !== event.maxTeamSize;
            const rangeToggle = document.getElementById('teamSizeRangeToggle');
            rangeToggle.checked = isRange;
            rangeToggle.dispatchEvent(new Event('change'));
            if (isRange) {
                document.getElementById('minTeamSize').value = event.minTeamSize || 2;
                document.getElementById('minTeamSize').dispatchEvent(new Event('change'));
                document.getElementById('maxTeamSize').value = event.maxTeamSize || 3;
            } else {
                document.getElementById('fixedTeamSize').value = event.maxTeamSize || 2;
            }
        }

        populateCustomQuestions('student-questions-container', event.studentCustomQuestions);
        populateCustomQuestions('faculty-questions-container', event.facultyCustomQuestions);
        
        const enablePaymentsCheckbox = document.getElementById('enablePayments');
        enablePaymentsCheckbox.checked = event.paymentsEnabled || false;
        enablePaymentsCheckbox.dispatchEvent(new Event('change'));
        if (event.paymentsEnabled) {
            document.getElementById('eventFee').value = event.eventFee || '';
            document.getElementById('paymentInstructions').value = event.paymentInstructions || '';
            if (event.qrCodeURL) {
                document.getElementById('current-qr-container').style.display = 'block';
                document.getElementById('current-qr-img').src = event.qrCodeURL;
            }
        }

        document.getElementById('emailContent').value = event.emailTemplate || '';
        document.getElementById('confirmationEmailContent').value = event.confirmationEmailTemplate || '';

    } catch (error) {
        console.error("Error fetching event for edit:", error);
        Swal.fire('Error', 'Could not load event data. Please try again.', 'error');
    }
}

// --- SCRIPT INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    const dashboardContent = document.getElementById('dashboard-content');
    const logoutButton = document.getElementById('logout-button');
    const eventForm = document.getElementById('create-event-form');
    const participationType = document.getElementById('participationType');
    const addQuestionBtn = document.getElementById('add-question-btn');
    const pastEventsForm = document.getElementById('past-events-form');
    const teamSettingsContainer = document.getElementById('team-settings-container');
    const teamSizeRangeToggle = document.getElementById('teamSizeRangeToggle');
    const fixedSizeContainer = document.getElementById('fixed-size-container');
    const rangeSizeContainer = document.getElementById('range-size-container');
    const minTeamSizeSelect = document.getElementById('minTeamSize');
    const maxTeamSizeSelect = document.getElementById('maxTeamSize');
    const fixedTeamSizeSelect = document.getElementById('fixedTeamSize');
    const submitButton = document.getElementById('submit-event-button');
    const formTitle = document.getElementById('form-title');
    const enablePaymentsCheckbox = document.getElementById('enablePayments');
    const paymentDetailsContainer = document.getElementById('payment-details-container');
    const finalEmailContainer = document.getElementById('final-email-container');
    const eventAudienceSelect = document.getElementById('eventAudience');
    const studentQuestionsSection = document.getElementById('student-questions-section');
    const facultyQuestionsSection = document.getElementById('faculty-questions-section');
    const addStudentQuestionBtn = document.getElementById('add-student-question-btn');
    const addFacultyQuestionBtn = document.getElementById('add-faculty-question-btn');
    
    const urlParams = new URLSearchParams(window.location.search);
    const eventIdToEdit = urlParams.get('edit');

    if (eventIdToEdit) {
        formTitle.textContent = 'Edit Live Event';
        submitButton.textContent = 'Save Changes';
        document.getElementById('eventPoster').required = false;
        populateFormForEdit(eventIdToEdit);
    } else {
        document.getElementById('eventPoster').required = true;
    }
    
    if (logoutButton) {
        logoutButton.addEventListener('click', () => auth.signOut().then(() => window.location.href = 'admin-login.html'));
    }

    if (enablePaymentsCheckbox) {
        enablePaymentsCheckbox.addEventListener('change', (e) => {
            const isChecked = e.target.checked;
            paymentDetailsContainer.style.display = isChecked ? 'block' : 'none';
            finalEmailContainer.style.display = isChecked ? 'block' : 'none';
        });
    }

    if (eventAudienceSelect) {
        eventAudienceSelect.addEventListener('change', (e) => {
            const audience = e.target.value;
            studentQuestionsSection.style.display = (audience === 'students_only' || audience === 'students_and_faculty') ? 'block' : 'none';
            facultyQuestionsSection.style.display = (audience === 'faculty_only' || audience === 'students_and_faculty') ? 'block' : 'none';
        });
        eventAudienceSelect.dispatchEvent(new Event('change'));
    }
    
    if (participationType) {
        participationType.addEventListener('change', (e) => {
            teamSettingsContainer.style.display = e.target.value === 'team' ? 'block' : 'none';
        });
    }

    if (teamSizeRangeToggle) {
        teamSizeRangeToggle.addEventListener('change', (e) => {
            const isRange = e.target.checked;
            rangeSizeContainer.style.display = isRange ? 'block' : 'none';
            fixedSizeContainer.style.display = isRange ? 'none' : 'block';
        });
    }

    if (minTeamSizeSelect) {
        minTeamSizeSelect.addEventListener('change', () => {
            const minVal = parseInt(minTeamSizeSelect.value, 10);
            const maxVal = parseInt(maxTeamSizeSelect.value, 10);
            for (const option of maxTeamSizeSelect.options) {
                option.disabled = parseInt(option.value, 10) < minVal;
            }
            if (maxVal < minVal) {
                maxTeamSizeSelect.value = minVal;
            }
        });
    }
    
    function addQuestion(containerId) {
        const container = document.getElementById(containerId);
        const newQuestionHTML = `<div class="border p-2 mb-2 rounded bg-light">
            <div class="form-row align-items-center">
                <div class="col-md-7"><input type="text" class="form-control form-control-sm" data-type="label" placeholder="Question Label" required></div>
                <div class="col-md-4"><select class="form-control form-control-sm" data-type="type"><option value="text">Text Answer</option><option value="yesno">Yes / No</option><option value="rating">Rating (1-10)</option></select></div>
                <div class="col-md-1 text-right"><button type="button" class="btn btn-sm btn-danger" onclick="this.closest('.border').remove()">X</button></div>
            </div></div>`;
        container.insertAdjacentHTML('beforeend', newQuestionHTML);
    }
    
    if (addStudentQuestionBtn) {
        addStudentQuestionBtn.addEventListener('click', () => addQuestion('student-questions-container'));
    }
    if (addFacultyQuestionBtn) {
        addFacultyQuestionBtn.addEventListener('click', () => addQuestion('faculty-questions-container'));
    }

    if (eventForm) {
        eventForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            submitButton.disabled = true;
            submitButton.textContent = 'Saving...';
            
            const currentParticipationType = document.getElementById('participationType').value;
            let minTeamSize, maxTeamSize;

            if (currentParticipationType === 'team') {
                if (teamSizeRangeToggle.checked) {
                    minTeamSize = parseInt(minTeamSizeSelect.value, 10);
                    maxTeamSize = parseInt(maxTeamSizeSelect.value, 10);
                } else {
                    minTeamSize = parseInt(fixedTeamSizeSelect.value, 10);
                    maxTeamSize = minTeamSize;
                }
            } else {
                minTeamSize = 1;
                maxTeamSize = 1;
            }

            function getCustomQuestions(containerId) {
                return Array.from(document.querySelectorAll(`#${containerId} .border`)).map(q => ({
                    label: q.querySelector('[data-type="label"]').value,
                    type: q.querySelector('[data-type="type"]').value,
                })).filter(q => q.label);
            }

            const eventData = {
                eventName: document.getElementById('eventName').value,
                description: document.getElementById('eventDescription').value,
                participationType: currentParticipationType,
                eventAudience: document.getElementById('eventAudience').value,
                minTeamSize: minTeamSize,
                maxTeamSize: maxTeamSize,
                emailTemplate: document.getElementById('emailContent').value,
                confirmationEmailTemplate: document.getElementById('confirmationEmailContent').value,
                studentCustomQuestions: getCustomQuestions('student-questions-container'),
                facultyCustomQuestions: getCustomQuestions('faculty-questions-container'),
                paymentsEnabled: document.getElementById('enablePayments').checked,
                eventFee: document.getElementById('eventFee').value,
                paymentInstructions: document.getElementById('paymentInstructions').value,
            };
            
            const eventPosterFile = document.getElementById('eventPoster').files[0];
            const qrCodeFile = document.getElementById('qrCodeImage').files[0];

            try {
                if (eventPosterFile) {
                    const posterRef = storage.ref(`event_posters/${Date.now()}_${eventPosterFile.name}`);
                    const posterUpload = await posterRef.put(eventPosterFile);
                    eventData.posterURL = await posterUpload.ref.getDownloadURL();
                }

                if (eventData.paymentsEnabled && qrCodeFile) {
                    const qrRef = storage.ref(`qr_codes/${Date.now()}_${qrCodeFile.name}`);
                    const qrUpload = await qrRef.put(qrCodeFile);
                    eventData.qrCodeURL = await qrUpload.ref.getDownloadURL();
                }

                if (eventIdToEdit) {
                    await db.collection('events').doc(eventIdToEdit).update(eventData);
                    Swal.fire({
                        title: 'Success!',
                        text: 'Event updated successfully!',
                        icon: 'success',
                        timer: 2000,
                        showConfirmButton: false
                    }).then(() => {
                        window.location.href = 'admin.html';
                    });
                } else {
                    if (!eventPosterFile) {
                        Swal.fire('Error', 'Please select an event poster.', 'error');
                        submitButton.disabled = false;
                        submitButton.textContent = 'Save and Create Event';
                        return;
                    }
                    await db.collection('events').add({
                        ...eventData,
                        status: 'closed',
                        isActive: false,
                        createdAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                    const successMessage = document.getElementById('success-message');
                    successMessage.textContent = `Success! Event "${eventData.eventName}" has been created.`;
                    successMessage.style.display = 'block';
                    eventForm.reset();
                    document.getElementById('custom-questions-container').innerHTML = '';
                    participationType.dispatchEvent(new Event('change'));
                    teamSizeRangeToggle.checked = false;
                    teamSizeRangeToggle.dispatchEvent(new Event('change'));
                    enablePaymentsCheckbox.checked = false;
                    enablePaymentsCheckbox.dispatchEvent(new Event('change'));
                    displayEvents();
                    setTimeout(() => { successMessage.style.display = 'none'; }, 5000);
                }
            } catch (error) {
                console.error("Error saving event: ", error);
                Swal.fire('Error!', error.message, 'error');
            } finally {
                if (!eventIdToEdit) {
                    submitButton.disabled = false;
                    submitButton.textContent = 'Save and Create Event';
                }
            }
        });
    }

    if (pastEventsForm) {
        pastEventsForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitButton = pastEventsForm.querySelector('button[type="submit"]');
            submitButton.disabled = true;
            submitButton.textContent = 'Saving...';
            for (let i = 1; i <= 3; i++) {
                const title = document.getElementById(`pastEventTitle${i}`).value;
                const date = document.getElementById(`pastEventDate${i}`).value;
                const posterFile = document.getElementById(`pastEventPoster${i}`).files[0];
                if (title && date && posterFile) {
                    try {
                        const storageRef = storage.ref(`past_event_posters/${Date.now()}_slot${i}_${posterFile.name}`);
                        const uploadTask = await storageRef.put(posterFile);
                        const downloadURL = await uploadTask.ref.getDownloadURL();
                        await db.collection('pastEvents').add({ 
                            title, 
                            date, 
                            posterURL: downloadURL, 
                            createdAt: firebase.firestore.FieldValue.serverTimestamp() 
                        });
                    } catch (err) { 
                        Swal.fire('Error', `Error uploading Slot ${i}: ${err.message}`, 'error');
                    }
                }
            }
            pastEventsForm.reset();
            submitButton.disabled = false;
            submitButton.textContent = 'Save All Filled Past Events';
            displayPastEvents();
        });
    }

    auth.onAuthStateChanged((user) => {
        const loader = document.getElementById('loader');
        const dashboardContent = document.getElementById('dashboard-content');
        if (user) {
            loader.style.display = 'none';
            if (dashboardContent) dashboardContent.style.display = 'block';
            displayEvents();
            displayPastEvents();
        } else {
            window.location.href = 'admin-login.html';
        }
    });
}); 