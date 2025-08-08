// Initialize Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();

// --- PRELOADER AND CONTENT ELEMENTS ---
const preloader = document.getElementById("preloader");
const content = document.getElementById("content");

// --- Other Page Elements ---
const mainContent = document.getElementById('main-content');
const registrationSection = document.getElementById('registration-section');
const regFormContainer = document.getElementById('registration-form-container');
const regForm = document.getElementById('public-reg-form');

// --- PRELOADER HIDING FUNCTION ---
function hidePreloader() {
    if (preloader && content) {
        preloader.style.opacity = "0"; // Start fade out
        setTimeout(() => {
            preloader.style.display = "none";
            content.style.visibility = "visible"; // Make content take up space
            content.style.opacity = "1"; // Fade in content
        }, 1000); // Wait for fade out to complete
    }
}

// --- MAIN FUNCTION TO LOAD EVENT ---
async function loadActiveEvent() {
    try {
        const eventsRef = db.collection('events');
        const snapshot = await eventsRef.where('isActive', '==', true).limit(1).get();
        if (snapshot.empty) {
            displayNoEventMessage();
        } else {
            const eventDoc = snapshot.docs[0];
            const eventData = eventDoc.data();
            displayEventDetails(eventData);
            if (eventData.status === 'open') {
                generateRegistrationForm(eventData);
                registrationSection.style.display = 'block';
            } else {
                displayRegistrationClosedMessage();
            }
        }
    } catch (error) {
        console.error("Error loading active event:", error);
        displayNoEventMessage("Error loading event. Please try again later.");
    } finally {
        hidePreloader();
    }
}

// --- DISPLAY FUNCTIONS ---
function displayNoEventMessage(message = "There are no active events at the moment. Please check back later!") {
    if(mainContent) mainContent.innerHTML = `<div class="container text-center my-5"><h2>${message}</h2></div>`;
}

function displayRegistrationClosedMessage() {
    if (registrationSection) registrationSection.style.display = 'block';
    if (regForm) {
        regForm.innerHTML = `<div class="registration-closed"><h1>Registrations are currently closed.</h1></div>`;
    }
}

function displayEventDetails(event) {
    if (mainContent) {
        mainContent.innerHTML = `<section class="about"> <div class="container"> <div class="section-header"><h2>${event.eventName}</h2></div> <div class="row"> <div class="col-12"> <div class="main-poster"><img class="img" src="${event.posterURL}" alt="${event.eventName}"></div> <div class="event-description"><p class="description">${event.description}</p></div> </div> </div> </div> </section>`;
    }
}

// --- HELPER FUNCTION TO MANAGE FORM VISIBILITY ---
function handleTeamSizeChange(maxSize) {
    const selector = document.getElementById('team-size-selector');
    if (!selector) return;

    const selectedSize = parseInt(selector.value, 10);
    for (let i = 1; i <= maxSize; i++) {
        const participantBlock = document.getElementById(`participant-block-${i}`);
        if (participantBlock) {
            const isVisible = i <= selectedSize;
            participantBlock.style.display = isVisible ? 'block' : 'none';
            
            participantBlock.querySelectorAll('input, select').forEach(input => {
                if (input.name.endsWith('_ieee_id')) return;
                
                if (isVisible) {
                    input.setAttribute('required', 'required');
                } else {
                    input.removeAttribute('required');
                }
            });
        }
    }
}


// --- FORM GENERATION ---
function generateRegistrationForm(event) {
    const teamSizeSelectorContainer = document.getElementById('team-size-selector-container');
    let formHTML = '';
    let participantCount; 

    if (event.participationType === 'team') {
        if (event.minTeamSize === event.maxTeamSize) {
            participantCount = event.maxTeamSize;
            teamSizeSelectorContainer.style.display = 'none';
        } else {
            participantCount = event.maxTeamSize;
            teamSizeSelectorContainer.style.display = 'block';

            let selectorHTML = `<label for="team-size-selector">First, select your team size (from ${event.minTeamSize} to ${event.maxTeamSize}):</label>
                              <select id="team-size-selector" class="form-control mb-4">`;
            for (let i = event.minTeamSize; i <= event.maxTeamSize; i++) {
                selectorHTML += `<option value="${i}">Team of ${i}</option>`;
            }
            selectorHTML += '</select>';
            teamSizeSelectorContainer.innerHTML = selectorHTML;
        }
    } else {
        participantCount = 1;
        teamSizeSelectorContainer.style.display = 'none';
    }

    for (let i = 1; i <= participantCount; i++) {
        const participantLabel = (event.participationType === 'team') ? `Participant ${i}:` : 'Participant Details:';
        formHTML += `<div class="participant" id="participant-block-${i}">
                        <label class="participant-label">${participantLabel}</label>
                        <div class="fields">
                           <div class="row"> <div class="col-sm-6 form-group"><input type="text" class="form-control" placeholder="Name" name="p${i}_name" required></div> <div class="col-sm-6 form-group"><input type="text" class="form-control" placeholder="College Name" name="p${i}_college" required></div> </div> <div class="row"> <div class="col-sm-4 form-group"><select class="form-control" name="p${i}_year" required><option value="" disabled selected>Select Year</option><option value="2">2nd Year</option><option value="3">3rd Year</option><option value="4">4th Year</option></select></div> <div class="col-sm-4 form-group"><select class="form-control" name="p${i}_branch" required><option value="" disabled selected>Select Branch</option><option value="CIVIL">CIVIL</option><option value="CSB">CSB</option><option value="CSC">CSC</option><option value="CSD">CSD</option><option value="CSE">CSE</option><option value="CSM">CSM</option><option value="ECE">ECE</option><option value="EEE">EEE</option><option value="IT">IT</option><option value="MECH">MECH</option><option value="OTHERS">OTHERS</option></select></div> <div class="col-sm-4 form-group"><select class="form-control" name="p${i}_section" required><option value="" disabled selected>Select Section</option><option value="A">A</option><option value="B">B</option><option value="C">C</option><option value="D">D</option><option value="OTHERS">OTHERS</option></select></div> </div> <div class="row"> <div class="col-sm-4 form-group"><input type="text" class="form-control" placeholder="Roll No." name="p${i}_roll" required pattern="[a-zA-Z0-9]{10}" maxlength="10" title="Please enter a 10-character Roll No."></div> <div class="col-sm-4 form-group"><input type="email" class="form-control" placeholder="Email" name="p${i}_email" required></div> <div class="col-sm-4 form-group"><input type="tel" class="form-control" placeholder="Phone No." name="p${i}_phone" required></div> </div> <div class="row"> <div class="col-sm-6 form-group"><select class="form-control" name="p${i}_ieee_member" required><option value="" disabled selected>Are you an IEEE Member?</option><option value="Yes">Yes</option><option value="No">No</option></select></div> <div class="col-sm-6 form-group"><input type="text" class="form-control" placeholder="Membership ID (if applicable)" name="p${i}_ieee_id"></div> </div>
                        </div>
                     </div>`;
    }

    if (event.customQuestions && event.customQuestions.length > 0) {
        formHTML += `<div class="participant"><label class="participant-label">Additional Questions</label><div class="fields">`;
        event.customQuestions.forEach((q, index) => {
            const fieldName = `custom_q_${q.label.replace(/\s+/g, '_')}`;
            formHTML += `<div class="form-group"><label>${q.label}</label>`;
            if (q.type === 'text') {
                formHTML += `<input type="text" class="form-control" name="${fieldName}" required>`;
            } else if (q.type === 'yesno') {
                formHTML += `<select class="form-control" name="${fieldName}" required><option value="" disabled selected>Select an option</option><option value="Yes">Yes</option><option value="No">No</option></select>`;
            } else if (q.type === 'rating') {
                formHTML += `<select class="form-control" name="${fieldName}" required><option value="" disabled selected>Select a rating (1-10)</option>`;
                for (let j = 1; j <= 10; j++) formHTML += `<option value="${j}">${j}</option>`;
                formHTML += `</select>`;
            }
            formHTML += `</div>`;
        });
        formHTML += `</div></div>`;
    }

    if (regFormContainer) {
        regFormContainer.innerHTML = formHTML;
    }

    if (event.participationType === 'team' && event.minTeamSize < event.maxTeamSize) {
        const selector = document.getElementById('team-size-selector');
        if (selector) {
            selector.addEventListener('change', () => handleTeamSizeChange(event.maxTeamSize));
            handleTeamSizeChange(event.maxTeamSize);
        }
    }
}

// --- FORM SUBMISSION ---
if (regForm) {
    regForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitButton = document.getElementById('submit-button');
        submitButton.disabled = true;
        submitButton.textContent = 'Submitting...';
        
        try {
            const eventsRef = db.collection('events');
            const snapshot = await eventsRef.where('isActive', '==', true).limit(1).get();
            if (snapshot.empty) {
                Swal.fire('Registration Closed', 'This event is no longer active.', 'warning');
                submitButton.disabled = false;
                submitButton.textContent = 'Submit';
                return;
            }

            const eventData = snapshot.docs[0].data();
            const formData = new FormData(regForm);
            const registrationData = {};
            for (const [key, value] of formData.entries()) { registrationData[key] = value; }

            registrationData.timeStamp = firebase.firestore.FieldValue.serverTimestamp();

            let participantCount;
            const teamSizeSelector = document.getElementById('team-size-selector');
            if (teamSizeSelector && teamSizeSelector.offsetParent !== null) {
                participantCount = parseInt(teamSizeSelector.value, 10);
            } else if (eventData.participationType === 'team') {
                participantCount = eventData.maxTeamSize;
            } else {
                participantCount = 1;
            }
            registrationData.participantCount = participantCount;

            const collectionName = `${eventData.eventName.replace(/\s+/g, '')}${eventData.participationType === 'team' ? 'Teams' : 'Participants'}`;
            const mailCollectionName = `${eventData.eventName.replace(/\s+/g, '')}Mails`;

            await db.collection(collectionName).add(registrationData);

            const emails = [];
            let names = [];
            for (let i = 1; i <= participantCount; i++) {
                emails.push(registrationData[`p${i}_email`]);
                names.push(registrationData[`p${i}_name`]);
            }

            let mailSubject = `CONFIRMATION MAIL OF REGISTRATION | IEEE - VBIT SB`;
            let mailBody = eventData.emailTemplate.replace(/{name}/g, names.join(' & ')).replace(/{eventName}/g, eventData.eventName);
            await db.collection(mailCollectionName).add({ to: emails, message: { subject: mailSubject, html: mailBody } });

            Swal.fire({
                title: 'Registration Successful!',
                text: 'Thank you for registering. You will receive a confirmation email shortly.',
                icon: 'success',
                confirmButtonText: 'Great!'
            }).then((result) => {
                if (result.isConfirmed) { window.location.href = 'about.html'; }
            });

        } catch (error) {
            console.error("Error submitting registration:", error);
            Swal.fire('Submission Error', 'There was an error submitting your registration. Please try again.', 'error');
        } finally {
            if (submitButton) {
                submitButton.disabled = false;
                submitButton.textContent = 'Submit';
            }
        }
    });
}

// --- INITIALIZE THE PAGE ---
loadActiveEvent();