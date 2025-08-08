// Initialize Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();
const storage = firebase.storage();

// --- PRELOADER AND CONTENT ELEMENTS ---
const preloader = document.getElementById("preloader");
const content = document.getElementById("content");
const mainContent = document.getElementById('main-content');
const registrationSection = document.getElementById('registration-section');
const regFormContainer = document.getElementById('registration-form-container');
const regForm = document.getElementById('public-reg-form');

// --- PRELOADER HIDING FUNCTION ---
function hidePreloader() {
    if (preloader && content) {
        preloader.style.opacity = "0";
        setTimeout(() => {
            preloader.style.display = "none";
            content.style.visibility = "visible";
            content.style.opacity = "1";
        }, 1000);
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
                if (registrationSection) registrationSection.style.display = 'block';
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
    const regFormContainer = document.getElementById('registration-form-container');
    let finalHTML = '';
    
    // Step 1: Build the Participant Details Section
    const participantLabelText = event.paymentsEnabled ? 'Step 1: Fill Participant Details' : 'Registration Details';
    let participantHTML = `<div class="participant-header"><label class="participant-label">${participantLabelText}</label></div>`;

    const teamSizeSelectorContainer = document.getElementById('team-size-selector-container');
    if (event.participationType === 'team' && event.minTeamSize < event.maxTeamSize) {
        teamSizeSelectorContainer.style.display = 'block';
        let selectorHTML = `<label for="team-size-selector">First, select your team size (from ${event.minTeamSize} to ${event.maxTeamSize}):</label>
                            <select id="team-size-selector" class="form-control mb-4">`;
        for (let i = event.minTeamSize; i <= event.maxTeamSize; i++) {
            selectorHTML += `<option value="${i}">${i}</option>`;
        }
        selectorHTML += '</select>';
        teamSizeSelectorContainer.innerHTML = selectorHTML;
    } else {
        if(teamSizeSelectorContainer) teamSizeSelectorContainer.style.display = 'none';
    }

    const participantCount = event.participationType === 'team' ? (event.maxTeamSize || 1) : 1;
    for (let i = 1; i <= participantCount; i++) {
        participantHTML += `<div class="participant" id="participant-block-${i}">
                        <label class="participant-label">${(participantCount > 1) ? `Participant ${i}` : 'Your Details'}</label>
                        <div class="fields">
                           <div class="row"> <div class="col-sm-6 form-group"><input type="text" class="form-control" placeholder="Name" name="p${i}_name" required></div> <div class="col-sm-6 form-group"><input type="text" class="form-control" placeholder="College Name" name="p${i}_college" required></div> </div> <div class="row"> <div class="col-sm-4 form-group"><select class="form-control" name="p${i}_year" required><option value="" disabled selected>Select Year</option><option value="2">2nd Year</option><option value="3">3rd Year</option><option value="4">4th Year</option></select></div> <div class="col-sm-4 form-group"><select class="form-control" name="p${i}_branch" required><option value="" disabled selected>Select Branch</option><option value="CIVIL">CIVIL</option><option value="CSB">CSB</option><option value="CSC">CSC</option><option value="CSD">CSD</option><option value="CSE">CSE</option><option value="CSM">CSM</option><option value="ECE">ECE</option><option value="EEE">EEE</option><option value="IT">IT</option><option value="MECH">MECH</option><option value="OTHERS">OTHERS</option></select></div> <div class="col-sm-4 form-group"><select class="form-control" name="p${i}_section" required><option value="" disabled selected>Select Section</option><option value="A">A</option><option value="B">B</option><option value="C">C</option><option value="D">D</option><option value="OTHERS">OTHERS</option></select></div> </div> <div class="row"> <div class="col-sm-4 form-group"><input type="text" class="form-control" placeholder="Roll No." name="p${i}_roll" required pattern="[a-zA-Z0-9]{10}" maxlength="10" title="Please enter a 10-character Roll No."></div> <div class="col-sm-4 form-group"><input type="email" class="form-control" placeholder="Email" name="p${i}_email" required></div> <div class="col-sm-4 form-group"><input type="tel" class="form-control" placeholder="Phone No." name="p${i}_phone" required></div> </div> <div class="row"> <div class="col-sm-6 form-group"><select class="form-control" name="p${i}_ieee_member" required><option value="" disabled selected>Are you an IEEE Member?</option><option value="Yes">Yes</option><option value="No">No</option></select></div> <div class="col-sm-6 form-group"><input type="text" class="form-control" placeholder="Membership ID (if applicable)" name="p${i}_ieee_id"></div> </div>
                        </div>
                     </div>`;
    }

    // Custom Questions
    if (event.customQuestions && event.customQuestions.length > 0) {
        participantHTML += `<div class="participant"><label class="participant-label">Additional Questions</label><div class="fields">`;
        event.customQuestions.forEach((q) => {
            const fieldName = `custom_q_${q.label.replace(/\s+/g, '_')}`;
            participantHTML += `<div class="form-group"><label>${q.label}</label>`;
            if (q.type === 'text') {
                participantHTML += `<input type="text" class="form-control" name="${fieldName}" required>`;
            } else if (q.type === 'yesno') {
                participantHTML += `<select class="form-control" name="${fieldName}" required><option value="" disabled selected>Select an option</option><option value="Yes">Yes</option><option value="No">No</option></select>`;
            } else if (q.type === 'rating') {
                participantHTML += `<select class="form-control" name="${fieldName}" required><option value="" disabled selected>Select a rating (1-10)</option>`;
                for (let j = 1; j <= 10; j++) participantHTML += `<option value="${j}">${j}</option>`;
                participantHTML += `</select>`;
            }
            participantHTML += `</div>`;
        });
        participantHTML += `</div></div>`;
    }
    
    // Step 2: Build the Payment Section if enabled
    let paymentHTML = '';
    if (event.paymentsEnabled && event.qrCodeURL) {
        paymentHTML = `
            <div class="participant">
                <label class="participant-label">Step 2: Complete Your Payment</label>
                <div class="fields text-center">
                    <div class="payment-instructions">${event.paymentInstructions || ''}</div>
                    <h5 class="mt-2"><strong>Event Fee: ₹${event.eventFee}</strong></h5>
                    <img src="${event.qrCodeURL}" alt="Payment QR Code" style="max-width: 250px; border-radius: 8px;" class="mb-3">
                    <div class="row justify-content-center">
                        <div class="col-md-6 form-group">
                            <input type="text" class="form-control" placeholder="UPI Transaction ID" name="transactionId" required>
                        </div>
                        <div class="col-md-6 form-group">
                            <label for="paymentScreenshot" class="form-control-label" style="text-align: left; display: block;">Upload Payment Screenshot (Required)</label>
                            <input type="file" class="form-control-file" name="paymentScreenshot" accept="image/*" required>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // Step 3: Combine the sections in the new order
    finalHTML = participantHTML + paymentHTML;
    
    if (regFormContainer) {
        regFormContainer.innerHTML = finalHTML;
    }

    if (event.participationType === 'team' && event.minTeamSize < event.maxTeamSize) {
        const selector = document.getElementById('team-size-selector');
        if (selector) {
            selector.addEventListener('change', () => handleTeamSizeChange(event.maxTeamSize));
            handleTeamSizeChange(event.maxTeamSize); // Call it once initially
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
                return;
            }

            const eventData = snapshot.docs[0].data();
            const formData = new FormData(regForm);
            const registrationData = {};
            for (const [key, value] of formData.entries()) { 
                if (key !== 'paymentScreenshot') {
                    registrationData[key] = value;
                }
            }

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

            if (eventData.paymentsEnabled) {
                const screenshotFile = formData.get('paymentScreenshot');
                if (!screenshotFile || screenshotFile.size === 0) throw new Error("Payment screenshot is required.");
                
                const screenshotRef = storage.ref(`screenshots/${Date.now()}_${screenshotFile.name}`);
                const uploadTask = await screenshotRef.put(screenshotFile);
                registrationData.screenshotURL = await uploadTask.ref.getDownloadURL();
                registrationData.verificationStatus = 'pending';
            } else {
                registrationData.verificationStatus = 'not-required';
            }
            
            // =========== CRITICAL FIX START ===========
            // This ensures that even if participationType is missing from the event data, it defaults to 'individual'
            const participationType = eventData.participationType || 'individual';
            const collectionSuffix = participationType === 'team' ? 'Teams' : 'Participants';
            const collectionName = `${eventData.eventName.replace(/\s+/g, '')}${collectionSuffix}`;
            const mailCollectionName = `${eventData.eventName.replace(/\s+/g, '')}Mails`;
            // =========== CRITICAL FIX END ===========

            await db.collection(collectionName).add(registrationData);
            
            const emails = [];
            let names = [];
            for (let i = 1; i <= participantCount; i++) {
                if (registrationData[`p${i}_email`]) emails.push(registrationData[`p${i}_email`]);
                if (registrationData[`p${i}_name`]) names.push(registrationData[`p${i}_name`]);
            }
            
            let mailSubject = `Registration Submitted | ${eventData.eventName}`;
            let mailBody = eventData.emailTemplate.replace(/{name}/g, names.join(' & ')).replace(/{eventName}/g, eventData.eventName);
            await db.collection(mailCollectionName).add({ to: emails, message: { subject: mailSubject, html: mailBody } });

            const successTitle = eventData.paymentsEnabled ? 'Registration Submitted!' : 'Registration Successful!';
            const successText = eventData.paymentsEnabled 
                ? 'Your spot is reserved. You will receive a final confirmation email once your payment is verified by our team.'
                : 'Thank you for registering. You will receive a confirmation email shortly.';
            const successIcon = eventData.paymentsEnabled ? 'info' : 'success';

            Swal.fire({
                title: successTitle,
                text: successText,
                icon: successIcon,
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