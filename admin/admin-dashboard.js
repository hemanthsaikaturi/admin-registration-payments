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
            const statusBadge = event.status === 'open' ? `<span class="badge badge-success">Open</span>` : `<span class="badge badge-secondary">Closed</span>`;
            const activeBadge = event.isActive ? `<span class="badge badge-primary">Yes</span>` : `<span class="badge badge-light">No</span>`;
            
            const row = `<tr>
                <td>${event.eventName}</td>
                <td>${statusBadge}</td>
                <td>${activeBadge}</td>
                <td>
                    <div class="action-buttons-container">
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
            if (confirm('Are you sure you want to delete this past event?')) {
                deletePastEvent(eventId);
            }
        });
    });
}

async function deletePastEvent(eventId) {
    try {
        await db.collection('pastEvents').doc(eventId).delete();
        displayPastEvents();
    } catch (error) {
        console.error("Error deleting past event: ", error);
        alert("Could not delete the event.");
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

        document.getElementById('eventName').value = event.eventName;
        document.getElementById('eventDescription').value = event.description;
        document.getElementById('emailContent').value = event.emailTemplate;

        if (event.posterURL) {
            document.getElementById('current-poster-container').style.display = 'block';
            document.getElementById('current-poster-img').src = event.posterURL;
            document.getElementById('eventPoster').required = false;
        }

        const participationSelect = document.getElementById('participationType');
        participationSelect.value = event.participationType;
        participationSelect.dispatchEvent(new Event('change'));

        if (event.participationType === 'team') {
            const isRange = event.minTeamSize !== event.maxTeamSize;
            const rangeToggle = document.getElementById('teamSizeRangeToggle');
            rangeToggle.checked = isRange;
            rangeToggle.dispatchEvent(new Event('change'));

            if (isRange) {
                document.getElementById('minTeamSize').value = event.minTeamSize;
                document.getElementById('minTeamSize').dispatchEvent(new Event('change'));
                document.getElementById('maxTeamSize').value = event.maxTeamSize;
            } else {
                document.getElementById('fixedTeamSize').value = event.maxTeamSize;
            }
        }

        const questionsContainer = document.getElementById('custom-questions-container');
        questionsContainer.innerHTML = '';
        if (event.customQuestions && event.customQuestions.length > 0) {
            event.customQuestions.forEach(q => {
                const newQuestionHTML = `<div class="border p-2 mb-2 rounded bg-light">
                    <div class="form-row align-items-center">
                        <div class="col-md-7"><input type="text" class="form-control form-control-sm" data-type="label" value="${q.label}" required></div>
                        <div class="col-md-4"><select class="form-control form-control-sm" data-type="type" value="${q.type}"><option value="text">Text Answer</option><option value="yesno">Yes / No</option><option value="rating">Rating (1-10)</option></select></div>
                        <div class="col-md-1 text-right"><button type="button" class="btn btn-sm btn-danger" onclick="this.closest('.border').remove()">X</button></div>
                    </div></div>`;
                questionsContainer.insertAdjacentHTML('beforeend', newQuestionHTML);
                questionsContainer.querySelector('.border:last-child [data-type="type"]').value = q.type;
            });
        }

    } catch (error) {
        console.error("Error fetching event for edit:", error);
        alert("Could not load event data. Please try again.");
    }
}

// --- SCRIPT INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    // --- Element Definitions ---
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
    
    const urlParams = new URLSearchParams(window.location.search);
    const eventIdToEdit = urlParams.get('edit');

    if (eventIdToEdit) {
        formTitle.textContent = 'Edit Live Event';
        submitButton.textContent = 'Save Changes';
        populateFormForEdit(eventIdToEdit);
    } else {
        document.getElementById('eventPoster').required = true;
    }
    
    // --- Event Listeners ---
    if (logoutButton) {
        logoutButton.addEventListener('click', () => auth.signOut().then(() => window.location.href = 'admin-login.html'));
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
    
    if (addQuestionBtn) {
        addQuestionBtn.addEventListener('click', () => {
            const container = document.getElementById('custom-questions-container');
            const newQuestionHTML = `<div class="border p-2 mb-2 rounded bg-light">
                <div class="form-row align-items-center">
                    <div class="col-md-7"><input type="text" class="form-control form-control-sm" data-type="label" placeholder="Question Label" required></div>
                    <div class="col-md-4"><select class="form-control form-control-sm" data-type="type"><option value="text">Text Answer</option><option value="yesno">Yes / No</option><option value="rating">Rating (1-10)</option></select></div>
                    <div class="col-md-1 text-right"><button type="button" class="btn btn-sm btn-danger" onclick="this.closest('.border').remove()">X</button></div>
                </div></div>`;
            container.insertAdjacentHTML('beforeend', newQuestionHTML);
        });
    }

    if (eventForm) {
        eventForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            submitButton.disabled = true;
            submitButton.textContent = 'Saving...';
            
            let minTeamSize, maxTeamSize;
            const currentParticipationType = participationType.value;
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

            const eventData = {
                eventName: document.getElementById('eventName').value,
                description: document.getElementById('eventDescription').value,
                participationType: currentParticipationType,
                minTeamSize: minTeamSize,
                maxTeamSize: maxTeamSize,
                emailTemplate: document.getElementById('emailContent').value,
                customQuestions: Array.from(document.querySelectorAll('#custom-questions-container .border')).map(q => ({
                    label: q.querySelector('[data-type="label"]').value,
                    type: q.querySelector('[data-type="type"]').value,
                })).filter(q => q.label)
            };
            
            const eventPosterFile = document.getElementById('eventPoster').files[0];

            try {
                if (eventPosterFile) {
                    const storageRef = storage.ref(`event_posters/${Date.now()}_${eventPosterFile.name}`);
                    const uploadTask = await storageRef.put(eventPosterFile);
                    eventData.posterURL = await uploadTask.ref.getDownloadURL();
                }

                if (eventIdToEdit) {
                    await db.collection('events').doc(eventIdToEdit).update(eventData);
                    alert('Event updated successfully!');
                    window.location.href = 'admin.html';
                } else {
                    if (!eventPosterFile) {
                        alert("Please select an event poster.");
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
                    participationType.dispatchEvent(new Event('change'));
                    teamSizeRangeToggle.checked = false;
                    teamSizeRangeToggle.dispatchEvent(new Event('change'));
                    displayEvents();
                    setTimeout(() => { successMessage.style.display = 'none'; }, 5000);
                }
            } catch (error) {
                console.error("Error saving event: ", error);
                alert("Error: " + error.message);
            } finally {
                if (!eventIdToEdit) {
                    submitButton.disabled = false;
                    submitButton.textContent = 'Save and Create Event';
                }
            }
        });
    }

    // =========== NEWLY ADDED/RESTORED CODE BLOCK START ===========
    if (pastEventsForm) {
        pastEventsForm.addEventListener('submit', async (e) => {
            e.preventDefault(); // This is the crucial line that prevents the page refresh.
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
                        alert(`Error uploading Slot ${i}: ${err.message}`); 
                    }
                }
            }
            
            pastEventsForm.reset();
            submitButton.disabled = false;
            submitButton.textContent = 'Save All Filled Past Events';
            displayPastEvents();
        });
    }
    // =========== NEWLY ADDED/RESTORED CODE BLOCK END ===========

    auth.onAuthStateChanged((user) => {
        const loader = document.getElementById('loader');
        const dashboardContent = document.getElementById('dashboard-content');
        if (user) {
            loader.style.display = 'none';
            if(dashboardContent) dashboardContent.style.display = 'block';
            displayEvents();
            displayPastEvents();
        } else {
            window.location.href = 'admin-login.html';
        }
    });
});