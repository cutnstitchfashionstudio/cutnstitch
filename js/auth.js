// Removed Firebase

// Global Custom Alert
window.ShowAlert = function(message) {
  // Create overlay
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position: fixed; inset: 0; background: rgba(0,0,0,0.4); backdrop-filter: blur(4px);
    z-index: 9999; display: flex; align-items: center; justify-content: center;
    opacity: 0; transition: opacity 0.3s ease;
  `;
  
  // Create modal box
  const box = document.createElement('div');
  box.style.cssText = `
    background: white; padding: 32px; border-radius: 16px; box-shadow: 0 20px 40px rgba(0,0,0,0.2);
    width: 90%; max-width: 360px; text-align: center;
    transform: scale(0.9) translateY(20px); opacity: 0; transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  `;
  
  // Icon
  const icon = document.createElement('div');
  icon.innerHTML = '✨';
  icon.style.cssText = 'font-size: 48px; margin-bottom: 16px;';
  
  // Message
  const text = document.createElement('p');
  text.innerHTML = message;
  text.style.cssText = 'font-family: "Inter", sans-serif; font-size: 16px; color: #333; line-height: 1.5; margin-bottom: 24px; font-weight: 500;';
  
  // Button
  const btn = document.createElement('button');
  btn.textContent = 'Return';
  btn.style.cssText = `
    background: #f57224; color: white; border: none; border-radius: 8px;
    padding: 12px 24px; font-size: 14px; font-weight: bold; cursor: pointer;
    width: 100%; transition: background 0.3s;
  `;
  btn.onmouseover = () => btn.style.background = '#d05d1a';
  btn.onmouseout = () => btn.style.background = '#f57224';
  
  // Assemble
  box.appendChild(icon);
  box.appendChild(text);
  box.appendChild(btn);
  overlay.appendChild(box);
  document.body.appendChild(overlay);
  
  // Animate in
  requestAnimationFrame(() => {
    overlay.style.opacity = '1';
    box.style.opacity = '1';
    box.style.transform = 'scale(1) translateY(0)';
  });
  
  // Close logic
  const close = () => {
    overlay.style.opacity = '0';
    box.style.transform = 'scale(0.9) translateY(20px)';
    box.style.opacity = '0';
    setTimeout(() => { if (document.body.contains(overlay)) document.body.removeChild(overlay); }, 300);
  };
  window.CloseAlert = close;
  btn.onclick = close;
  overlay.onclick = (e) => { if(e.target === overlay) close(); };
};


window.ShowToast = function(message, type = 'error') {
  const toast = document.createElement('div');
  const bgColor = type === 'error' ? '#f44336' : '#4caf50';
  toast.style.cssText = `
    position: fixed; top: 20px; left: 50%; background: ${bgColor}; color: white;
    padding: 16px 24px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    font-family: "Inter", sans-serif; font-size: 14px; font-weight: 500;
    z-index: 10000; transform: translate(-50%, -150%); opacity: 0; transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    display: flex; align-items: center; gap: 12px;
  `;
  
  const icon = document.createElement('span');
  icon.innerHTML = type === 'error' ? '⚠️' : '✅';
  icon.style.fontSize = '18px';
  
  const text = document.createElement('span');
  text.innerHTML = message;
  
  toast.appendChild(icon);
  toast.appendChild(text);
  document.body.appendChild(toast);
  
  requestAnimationFrame(() => {
    toast.style.transform = 'translate(-50%, 0)';
    toast.style.opacity = '1';
  });
  
  setTimeout(() => {
    toast.style.transform = 'translate(-50%, -150%)';
    toast.style.opacity = '0';
    setTimeout(() => {
      if (document.body.contains(toast)) {
        document.body.removeChild(toast);
      }
    }, 300);
  }, 3000);
};

const Auth = {
  currentUser: null,

  init() {
    this.injectModal();
    this.injectDropdown();
    this.checkAuth();
    this.bindEvents();
    
    // Remember me check
    const remembered = localStorage.getItem('rememberedEmail');
    if (remembered) {
      setTimeout(() => {
        const emailInput = document.getElementById('authEmail');
        if (emailInput) {
          emailInput.value = remembered;
          document.getElementById('authRemember').checked = true;
        }
      }, 500);
    }

    // Check for OAuth success OR logged-out redirect
    const urlParams = new URLSearchParams(window.location.search);

    if (urlParams.get('login') === 'success') {
      // ── OAuth callback: fetch session from server and store ──────────────
      fetch('/api/auth-handler?action=me')
        .then(async res => {
          const text = await res.text();
          try { return JSON.parse(text); }
          catch (e) { throw new Error(`API Error (${res.status}): ` + text.substring(0, 150)); }
        })
        .then(data => {
          if (data.authenticated && data.user) {
            this.currentUser = data.user;
            localStorage.setItem('currentUser', JSON.stringify(data.user));
            this.checkAuth();
            window.history.replaceState({}, document.title, window.location.pathname);
            window.location.href = '/portal.html';
          } else {
            window.ShowAlert('Session check failed: ' + JSON.stringify(data));
          }
        })
        .catch(err => {
          console.error('Error fetching session:', err);
          window.ShowAlert('Network error checking session');
        });

    } else if (urlParams.get('logged_out') === '1' || sessionStorage.getItem('nss_logged_out')) {
      // ── Post-logout load: skip /me entirely, ensure clean state ──────────
      sessionStorage.removeItem('nss_logged_out');
      this.currentUser = null;
      localStorage.removeItem('currentUser');
      // Clean the URL so F5 won't re-trigger this branch forever
      if (urlParams.get('logged_out') === '1') {
        window.history.replaceState({}, document.title, window.location.pathname);
      }
      this.checkAuth();

    } else {
      // ── Normal page load: proactively sync session from server ───────────
      fetch('/api/auth-handler?action=me')
        .then(res => res.json())
        .then(data => {
          if (data.authenticated && data.user) {
            this.currentUser = data.user;
            localStorage.setItem('currentUser', JSON.stringify(data.user));
            this.checkAuth();
          } else {
            if (this.currentUser) {
              this.currentUser = null;
              localStorage.removeItem('currentUser');
              this.checkAuth();
            }
          }
        })
        .catch(err => console.error('Error refreshing session:', err));
    }
  },

  injectModal() {
    if (document.getElementById('authOverlay')) return;
    
    const modalHTML = `
      <div class="auth-overlay" id="authOverlay">
        <div class="auth-modal" id="authModal">
          <button class="auth-close" onclick="Auth.closeModal()">&times;</button>
          
          <div class="auth-views-container">
            
            <!-- LOGIN VIEW -->
            <div class="auth-view active" id="view-login">
              <div class="auth-header">
                <button class="auth-tab-btn active" onclick="Auth.switchTab('password')">Password</button>
                <div class="auth-tab-divider"></div>
                <button class="auth-tab-btn" onclick="Auth.switchTab('phone')">Phone Number</button>
              </div>
              
              <div class="auth-body">
                <!-- Password Tab -->
                <div class="auth-tab-pane active" id="pane-password">
                  <form onsubmit="Auth.login(event)">
                    <div class="auth-input-group">
                      <input type="text" id="authEmail" class="auth-input" placeholder="Please enter your Phone or Email" required>
                    </div>
                    <div class="auth-input-group">
                      <input type="password" id="authPassword" class="auth-input" placeholder="Please enter your password" required>
                      <button type="button" class="auth-eye" onclick="Auth.togglePassword()">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 36 36" width="24" height="24" stroke="currentColor" stroke-width="2.54" stroke-linecap="round" stroke-linejoin="round"><path d="M32.711 11c-3.166 4.841-8.573 8.03-14.71 8.03-6.139 0-11.546-3.189-14.712-8.03M9.79 17.5l-3 5m8.5-3-1 5.5m12.5-7.5 3 5m-8.5-3 1 5.5"></path></svg>
                      </button>
                    </div>
                    
                    <div class="auth-links" style="justify-content: space-between;">
                      <label style="font-size: 12px; color: #666; display: flex; align-items: center; gap: 4px;">
                        <input type="checkbox" id="authRemember"> Remember me
                      </label>
                      <a href="#" class="auth-link" onclick="Auth.forgotPassword(event)">Forgot password?</a>
                    </div>
                    
                    <button type="submit" class="auth-submit">LOGIN</button>
                    
                    <div class="auth-footer">
                      Don't have an account? <a href="#" class="auth-link" onclick="Auth.showSignup(event); if(window.CloseAlert) window.CloseAlert();">Sign up</a>
                    </div>
                  </form>
                </div>
                
                <!-- Phone Tab -->
                <div class="auth-tab-pane" id="pane-phone">
                  <form onsubmit="Auth.sendCode(event)">
                    <div class="phone-input-wrapper">
                      <div class="custom-country-select" onclick="Auth.toggleCountryDropdown(this)">
                        <span class="selected-flag">🇵🇰</span>
                        <span class="dropdown-arrow">▼</span>
                        <ul class="country-dropdown-list">
                          <li onclick="Auth.selectCountry(event, '+92', '🇵🇰')">🇵🇰 Pakistan (+92)</li>
                          <li onclick="Auth.selectCountry(event, '+1', '🇺🇸')">🇺🇸 United States (+1)</li>
                          <li onclick="Auth.selectCountry(event, '+44', '🇬🇧')">🇬🇧 United Kingdom (+44)</li>
                          <li onclick="Auth.selectCountry(event, '+971', '🇦🇪')">🇦🇪 UAE (+971)</li>
                          <li onclick="Auth.selectCountry(event, '+61', '🇦🇺')">🇦🇺 Australia (+61)</li>
                        </ul>
                      </div>
                      <input type="tel" id="authPhone" class="phone-input" value="+92 " placeholder="Phone number" required>
                    </div>
                    
                    <button type="submit" class="auth-submit" style="display: flex; align-items: center; justify-content: center; gap: 8px;">
                      Send SMS Code
                    </button>
                    
                    <div class="auth-footer">
                      Don't have an account? <a href="#" class="auth-link" onclick="Auth.showSignup(event); if(window.CloseAlert) window.CloseAlert();">Sign up</a>
                    </div>
                  </form>
                </div>
              </div>
              
              <div class="auth-or">Or, login with</div>
              <div class="auth-social" style="padding-bottom: 24px;">
                <button type="button" class="auth-social-btn" onclick="window.location.href='/api/auth/google'">
                  <svg viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/><path d="M1 1h22v22H1z" fill="none"/></svg> Google
                </button>
                <button type="button" class="auth-social-btn" onclick="window.location.href='/api/auth/facebook'">
                  <svg viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg"><path d="M12 2.04C6.5 2.04 2 6.53 2 12.06C2 17.06 5.66 21.21 10.44 21.96V14.96H7.9V12.06H10.44V9.85C10.44 7.34 11.93 5.96 14.22 5.96C15.31 5.96 16.45 6.15 16.45 6.15V8.62H15.19C13.95 8.62 13.56 9.39 13.56 10.18V12.06H16.34L15.89 14.96H13.56V21.96A10 10 0 0 0 22 12.06C22 6.53 17.5 2.04 12 2.04Z" fill="#1877f2"/></svg> Facebook
                </button>
              </div>
            </div>

            <!-- SIGNUP VIEW -->
            <div class="auth-view" id="view-signup">
              <div class="auth-header" style="justify-content: center; padding-bottom: 24px; border-bottom: 1px solid transparent;">
                <h3 style="margin: 0; font-family: 'Inter', sans-serif; font-size: 18px; font-weight: 500; color: #333;">Sign up</h3>
              </div>
              
              <div class="auth-body">
                <div id="pane-signup">
                  <form onsubmit="Auth.registerUser(event)">
                    <div class="auth-input-group" style="margin-bottom: 16px;">
                      <input type="text" id="signupName" class="auth-input" placeholder="Please enter your Name" required>
                    </div>
                    <div class="auth-input-group" style="margin-bottom: 16px;">
                      <input type="text" id="signupIdentifier" class="auth-input" placeholder="Please enter your Phone or Email" required>
                    </div>
                    <div class="auth-input-group">
                      <input type="password" id="signupPassword" class="auth-input" placeholder="Please enter your password" required>
                      <button type="button" class="auth-eye" onclick="Auth.togglePassword('signupPassword')">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 36 36" width="24" height="24" stroke="currentColor" stroke-width="2.54" stroke-linecap="round" stroke-linejoin="round"><path d="M32.711 11c-3.166 4.841-8.573 8.03-14.71 8.03-6.139 0-11.546-3.189-14.712-8.03M9.79 17.5l-3 5m8.5-3-1 5.5m12.5-7.5 3 5m-8.5-3 1 5.5"></path></svg>
                      </button>
                    </div>
                    
                    <label style="font-size: 12px; color: #666; display: flex; align-items: flex-start; gap: 8px; margin-bottom: 16px;">
                      <input type="checkbox" required style="margin-top: 3px;"> 
                      <span>By creating and/or using your account, you agree to our <a href="#" class="auth-link">Terms of Use</a> and <a href="#" class="auth-link">Privacy Policy</a>.</span>
                    </label>
                    
                    <button type="submit" class="auth-submit" style="display: flex; align-items: center; justify-content: center; gap: 8px;">
                      SIGN UP
                    </button>
                    
                    <div class="auth-footer">
                      Already have an account? <a href="#" class="auth-link" onclick="Auth.showLogin(event); if(window.CloseAlert) window.CloseAlert();">Log in Now</a>
                    </div>
                  </form>
                </div>
              </div>
              
              <div class="auth-or">Or, sign up with</div>
              <div class="auth-social" style="padding-bottom: 24px;">
                <button type="button" class="auth-social-btn" onclick="window.location.href='/api/auth/google'">
                  <svg viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/><path d="M1 1h22v22H1z" fill="none"/></svg> Google
                </button>
                <button type="button" class="auth-social-btn" onclick="window.location.href='/api/auth/facebook'">
                  <svg viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg"><path d="M12 2.04C6.5 2.04 2 6.53 2 12.06C2 17.06 5.66 21.21 10.44 21.96V14.96H7.9V12.06H10.44V9.85C10.44 7.34 11.93 5.96 14.22 5.96C15.31 5.96 16.45 6.15 16.45 6.15V8.62H15.19C13.95 8.62 13.56 9.39 13.56 10.18V12.06H16.34L15.89 14.96H13.56V21.96A10 10 0 0 0 22 12.06C22 6.53 17.5 2.04 12 2.04Z" fill="#1877f2"/></svg> Facebook
                </button>
              </div>
            </div>

            
            <!-- SIGNUP - VERIFY -->
            <div class="auth-view" id="view-signup-verify">
              <div class="auth-header" style="justify-content: flex-start; padding-bottom: 24px; border-bottom: none;">
                <h3 style="margin: 0; font-family: 'Inter', sans-serif; font-size: 18px; font-weight: 500; color: #333;">Verify your email</h3>
              </div>
              
              <div class="auth-body" style="padding-top: 0; display: flex; flex-direction: column; flex-grow: 1;">
                <p style="font-size: 14px; color: #555; margin-bottom: 24px; line-height: 1.5;">Please enter the 6-digit code sent to <span id="signupVerifyEmail" style="color: #333; font-weight: 500;"></span></p>
                
                <form onsubmit="Auth.handleSignupVerify(event)" style="display: flex; flex-direction: column; flex-grow: 1; width: 100%;">
                  <div class="otp-container" style="width: 100%; justify-content: space-between;">
                    <input type="text" maxlength="1" class="otp-box" style="flex: 1; max-width: 45px;" required oninput="Auth.handleOtpInput(this, 1, 'signup')" onkeydown="Auth.handleOtpKeydown(event, this, 1, 'signup')" onpaste="Auth.handleOtpPaste(event, 'signup')" onfocus="this.select()">
                    <input type="text" maxlength="1" class="otp-box" style="flex: 1; max-width: 45px;" required oninput="Auth.handleOtpInput(this, 2, 'signup')" onkeydown="Auth.handleOtpKeydown(event, this, 2, 'signup')" onpaste="Auth.handleOtpPaste(event, 'signup')" onfocus="this.select()">
                    <input type="text" maxlength="1" class="otp-box" style="flex: 1; max-width: 45px;" required oninput="Auth.handleOtpInput(this, 3, 'signup')" onkeydown="Auth.handleOtpKeydown(event, this, 3, 'signup')" onpaste="Auth.handleOtpPaste(event, 'signup')" onfocus="this.select()">
                    <input type="text" maxlength="1" class="otp-box" style="flex: 1; max-width: 45px;" required oninput="Auth.handleOtpInput(this, 4, 'signup')" onkeydown="Auth.handleOtpKeydown(event, this, 4, 'signup')" onpaste="Auth.handleOtpPaste(event, 'signup')" onfocus="this.select()">
                    <input type="text" maxlength="1" class="otp-box" style="flex: 1; max-width: 45px;" required oninput="Auth.handleOtpInput(this, 5, 'signup')" onkeydown="Auth.handleOtpKeydown(event, this, 5, 'signup')" onpaste="Auth.handleOtpPaste(event, 'signup')" onfocus="this.select()">
                    <input type="text" maxlength="1" class="otp-box" style="flex: 1; max-width: 45px;" required oninput="Auth.handleOtpInput(this, 6, 'signup')" onkeydown="Auth.handleOtpKeydown(event, this, 6, 'signup')" onpaste="Auth.handleOtpPaste(event, 'signup')" onfocus="this.select()">
                  </div>
                  <div style="font-size: 14px; color: #999; margin-top: 16px;" id="signupResendWrapper">
                    Resend OTP in <span id="signupResendTimer" style="color: #00bcd4; font-weight: bold;">60</span> s
                  </div>
                  <div style="font-size: 11px; color: #777; margin-top: 8px;">
                    (Please check your spam/junk folder before requesting a new code)
                  </div>
                  
                  <div style="display: flex; gap: 12px; margin-top: auto; padding-bottom: 16px; width: 100%;">
                    <button type="button" class="btn-forgot-action outline" style="flex: 1;" onclick="Auth.showSignup(event); if(window.CloseAlert) window.CloseAlert();">Back</button>
                    <button type="submit" class="btn-forgot-action solid" style="flex: 1;">Verify</button>
                  </div>
                </form>
              </div>
            </div>

            <!-- FORGOT PASSWORD - REQUEST -->
            <div class="auth-view" id="view-forgot-request">
              <div class="auth-header" style="justify-content: flex-start; padding-bottom: 24px; border-bottom: none;">
                <h3 style="margin: 0; font-family: 'Inter', sans-serif; font-size: 18px; font-weight: 500; color: #333;">Forgot your password?</h3>
              </div>
              
              <div class="auth-body" style="padding-top: 0; display: flex; flex-direction: column; flex-grow: 1;">
                <p style="font-size: 14px; color: #555; margin-bottom: 24px; line-height: 1.5;">Please enter the account that you want to reset the password.</p>
                <form onsubmit="Auth.handleForgotRequest(event)" style="display: flex; flex-direction: column; flex-grow: 1; width: 100%;">
                  <div style="font-size: 14px; font-weight: 500; color: #333; margin-bottom: 8px;">Phone Number or Email</div>
                  <div class="auth-input-group" style="width: 100%;">
                    <input type="text" id="forgotInput" class="auth-input" placeholder="Please enter your Phone Number or Email" style="width: 100%; box-sizing: border-box;" required>
                  </div>
                  
                  <div style="display: flex; gap: 12px; margin-top: auto; padding-bottom: 16px; width: 100%;">
                    <button type="button" class="btn-forgot-action outline" style="flex: 1;" onclick="Auth.showLogin(event); if(window.CloseAlert) window.CloseAlert();">Back</button>
                    <button type="submit" class="btn-forgot-action solid" style="flex: 1;">Confirm</button>
                  </div>
                </form>
              </div>
            </div>

            <!-- FORGOT PASSWORD - VERIFY -->
            <div class="auth-view" id="view-forgot-verify">
              <div class="auth-header" style="justify-content: flex-start; padding-bottom: 24px; border-bottom: none;">
                <h3 style="margin: 0; font-family: 'Inter', sans-serif; font-size: 18px; font-weight: 500; color: #333;">Verify your identity</h3>
              </div>
              
              <div class="auth-body" style="padding-top: 0; display: flex; flex-direction: column; flex-grow: 1;">
                <p style="font-size: 14px; color: #555; margin-bottom: 24px; line-height: 1.5;">Please enter the OTP via <span id="forgotVerifyTarget"></span> to continue</p>
                
                <div style="font-size: 14px; color: #555; margin-bottom: 16px;">
                  Email:<span id="forgotVerifyEmail" style="color: #333; font-weight: 500;"></span> 
                  <a href="#" class="auth-link" style="margin-left: 12px; font-size: 14px;" onclick="Auth.showForgotRequest(event)">Change Email</a>
                </div>

                <form onsubmit="Auth.handleForgotVerify(event)" style="display: flex; flex-direction: column; flex-grow: 1; width: 100%;">
                  <div class="otp-container" style="width: 100%; justify-content: space-between;">
                    <input type="text" maxlength="1" class="otp-box" style="flex: 1; max-width: 45px;" required oninput="Auth.handleOtpInput(this, 1)" onkeydown="Auth.handleOtpKeydown(event, this, 1)" onpaste="Auth.handleOtpPaste(event)" onfocus="this.select()">
                    <input type="text" maxlength="1" class="otp-box" style="flex: 1; max-width: 45px;" required oninput="Auth.handleOtpInput(this, 2)" onkeydown="Auth.handleOtpKeydown(event, this, 2)" onpaste="Auth.handleOtpPaste(event)" onfocus="this.select()">
                    <input type="text" maxlength="1" class="otp-box" style="flex: 1; max-width: 45px;" required oninput="Auth.handleOtpInput(this, 3)" onkeydown="Auth.handleOtpKeydown(event, this, 3)" onpaste="Auth.handleOtpPaste(event)" onfocus="this.select()">
                    <input type="text" maxlength="1" class="otp-box" style="flex: 1; max-width: 45px;" required oninput="Auth.handleOtpInput(this, 4)" onkeydown="Auth.handleOtpKeydown(event, this, 4)" onpaste="Auth.handleOtpPaste(event)" onfocus="this.select()">
                    <input type="text" maxlength="1" class="otp-box" style="flex: 1; max-width: 45px;" required oninput="Auth.handleOtpInput(this, 5)" onkeydown="Auth.handleOtpKeydown(event, this, 5)" onpaste="Auth.handleOtpPaste(event)" onfocus="this.select()">
                    <input type="text" maxlength="1" class="otp-box" style="flex: 1; max-width: 45px;" required oninput="Auth.handleOtpInput(this, 6)" onkeydown="Auth.handleOtpKeydown(event, this, 6)" onpaste="Auth.handleOtpPaste(event)" onfocus="this.select()">
                  </div>
                  
                  <div id="otpTimerWrapper" style="margin-top: 16px; font-size: 14px; color: #999;">
                    Resend OTP in <span id="otpTimerCount" style="color: #1a9cb7; font-weight: 500;">60</span> s
                  </div>
                  <div id="otpResendWrapper" style="margin-top: 16px; display: none;">
                    <a href="#" class="auth-link" style="font-size: 14px;" onclick="Auth.handleForgotRequest(event)">Click here to resend OTP</a>
                  </div>
                  <div style="font-size: 11px; color: #777; margin-top: 8px;">
                    (Please check your spam/junk folder before requesting a new code)
                  </div>
                  
                  <div style="display: flex; gap: 12px; margin-top: auto; padding-bottom: 16px; width: 100%;">
                    <button type="button" class="btn-forgot-action outline" style="flex: 1;" onclick="Auth.showForgotRequest(event)">Back</button>
                    <button type="submit" class="btn-forgot-action solid" style="flex: 1;">Confirm</button>
                  </div>
                </form>
              </div>
            </div>

            <!-- FORGOT PASSWORD - RESET -->
            <div class="auth-view" id="view-forgot-reset">
              <div class="auth-header" style="justify-content: flex-start; padding-bottom: 24px; border-bottom: none;">
                <h3 style="margin: 0; font-family: 'Inter', sans-serif; font-size: 18px; font-weight: 500; color: #333;">Reset your password</h3>
              </div>
              
              <div class="auth-body" style="padding-top: 0; display: flex; flex-direction: column; flex-grow: 1;">
                <p style="font-size: 14px; color: #555; margin-bottom: 24px; line-height: 1.5;">Please enter your new password.</p>
                <form onsubmit="Auth.handleForgotReset(event)" style="display: flex; flex-direction: column; flex-grow: 1; width: 100%;">
                  <div style="font-size: 14px; font-weight: 500; color: #333; margin-bottom: 8px;">New Password</div>
                  <div class="auth-input-group" style="width: 100%;">
                    <input type="password" id="forgotNewPassword" class="auth-input" placeholder="Enter new password" style="width: 100%; box-sizing: border-box;" required oninput="Auth.handlePasswordValidation(this)">
                    <button type="button" class="auth-eye" onclick="Auth.togglePassword('forgotNewPassword')">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 36 36" width="24" height="24" stroke="currentColor" stroke-width="2.54" stroke-linecap="round" stroke-linejoin="round"><path d="M32.711 11c-3.166 4.841-8.573 8.03-14.71 8.03-6.139 0-11.546-3.189-14.712-8.03M9.79 17.5l-3 5m8.5-3-1 5.5m12.5-7.5 3 5m-8.5-3 1 5.5"></path></svg>
                    </button>
                  </div>
                  
                  <ul class="password-validation-list" style="transition: color 0.3s ease;">
                    <li id="pw-criteria-len">The length of Password should be 8 - 20 characters.</li>
                    <li id="pw-criteria-char">Password should contain alphabets, numbers and special characters</li>
                    <li id="pw-criteria-sym">Password can only include ~.!@#$%^&*<> symbols</li>
                  </ul>
                  
                  <div style="display: flex; gap: 12px; margin-top: auto; padding-bottom: 16px; width: 100%;">
                    <button type="button" class="btn-forgot-action outline" style="flex: 1;" onclick="Auth.showForgotVerify(event)">Back</button>
                    <button type="submit" class="btn-forgot-action solid" style="flex: 1;">Confirm</button>
                  </div>
                </form>
              </div>
            </div>

            <!-- FORGOT PASSWORD - SUCCESS -->
            <div class="auth-view" id="view-forgot-success">
              <div class="auth-header" style="justify-content: flex-start; padding-bottom: 24px; border-bottom: none;">
                <h3 style="margin: 0; font-family: 'Inter', sans-serif; font-size: 18px; font-weight: 500; color: #333;">Reset your password</h3>
              </div>
              
              <div class="auth-body" style="padding-top: 0; text-align: center; display: flex; flex-direction: column; flex-grow: 1;">
                <div style="margin: 20px 0 30px;">
                  <!-- Using a generic shield/check icon matching the theme -->
                  <svg width="80" height="80" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" fill="#e6f5f8" stroke="#1a9cb7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M9 12l2 2 4-4" stroke="#1a9cb7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </div>
                <h4 style="font-family: 'Inter', sans-serif; font-size: 18px; font-weight: 500; color: #333; margin-bottom: 40px; text-align: center; line-height: 1.5;">Your password has been reset successfully!</h4>
                
                <div style="display: flex; margin-top: auto; padding-bottom: 16px; width: 100%;">
                  <button type="button" class="btn-forgot-action solid" style="flex: 1; padding: 12px;" onclick="Auth.finishForgotSuccess()">Go Shopping</button>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
  },

  injectDropdown() {
    if (document.getElementById('studioAccountDropdown')) return;
    const div = document.createElement('div');
    div.id = 'studioAccountDropdown';
    div.className = 'studio-account-dropdown';
    div.innerHTML = `
      <a href="portal.html" class="studio-dropdown-item">
        <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><circle cx="9" cy="9" r="1"/><circle cx="15" cy="9" r="1"/></svg>
        Manage My Account
      </a>
      <a href="portal.html" class="studio-dropdown-item">
        <svg viewBox="0 0 24 24"><rect x="3" y="8" width="18" height="12" rx="2"/><path d="M3 13h18"/><path d="M8 8V6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
        My Orders
      </a>
      <a href="catalog.html" class="studio-dropdown-item">
        <svg viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
        My Wishlist
      </a>
      <a href="#" class="studio-dropdown-item" onclick="window.ShowAlert('Review feature coming soon!'); return false;">
        <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polygon points="12 6 13.5 10.5 18 10.5 14.5 13.5 16 18 12 15 8 18 9.5 13.5 6 10.5 10.5 10.5"/></svg>
        My Reviews
      </a>
      <a href="#" class="studio-dropdown-item" onclick="window.ShowAlert('Returns portal coming soon!'); return false;">
        <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
        My Returns & Cancellations
      </a>
      <div class="studio-dropdown-item" onclick="Auth.logout()">
        <svg viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
        Logout
      </div>
    `;
    document.body.appendChild(div);

    // Close on outside click or item click
    document.addEventListener('click', (e) => {
      const drop = document.getElementById('studioAccountDropdown');
      if (drop && drop.classList.contains('active')) {
        const isOutsideClick = !e.target.closest('.studio-account-dropdown') && !e.target.closest('.nav-login-btn');
        const isItemClick = e.target.closest('.studio-dropdown-item');
        if (isOutsideClick || isItemClick) {
          drop.classList.remove('active');
          setTimeout(() => drop.style.display = 'none', 200);
        }
      }
    });
  },

  bindEvents() {
    // Close dropdowns when clicking outside
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.custom-country-select')) {
        document.querySelectorAll('.country-dropdown-list').forEach(list => {
          list.classList.remove('active');
        });
      }
    });

    // Override nav cart buttons if not logged in
    document.body.addEventListener('click', (e) => {
      const cartBtn = e.target.closest('.nav-cart-btn');
      if (cartBtn && !this.currentUser) {
        e.preventDefault();
        e.stopPropagation();
        this.openModal();
      }
    }, true); // use capture phase to intercept early
  },

  openModal() {
    this.showLogin(null); // Ensure modal resets to login view on open
    const overlay = document.getElementById('authOverlay');
    overlay.style.display = 'flex'; // Make it part of the layout
    // Small timeout to allow display flex to apply before transitioning opacity
    setTimeout(() => {
      overlay.classList.add('active');
    }, 10);
  },

  closeModal() {
    const overlay = document.getElementById('authOverlay');
    overlay.classList.remove('active'); // Start opacity fade
    // Wait for the opacity transition (0.3s) before physically removing it
    setTimeout(() => {
      overlay.style.display = 'none';
    }, 300);
  },

  switchTab(tab) {
    if (event) event.preventDefault();
    document.querySelectorAll('.auth-tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.auth-tab-pane').forEach(p => p.classList.remove('active'));
    
    if (event && event.target.classList.contains('auth-tab-btn')) {
      event.target.classList.add('active');
    } else {
      document.querySelector('.auth-tab-btn[onclick*="' + tab + '"]').classList.add('active');
    }
    
    document.getElementById('pane-' + tab).classList.add('active');
  },

  showSignup(e) {
    if (e) e.preventDefault();
    this.hideAllViews();
    setTimeout(() => {
      document.getElementById('view-signup').classList.add('active');
    }, 600);
  },

  showLogin(e) {
    if (e) e.preventDefault();
    this.hideAllViews();
    if (e !== null) this.switchTab('password');
    setTimeout(() => {
      document.getElementById('view-login').classList.add('active');
    }, e !== null ? 600 : 0);
  },

  showSignupVerify(e) {
    if (e) e.preventDefault();
    document.querySelectorAll('.auth-view').forEach(v => v.classList.remove('active'));
    document.getElementById('view-signup-verify').classList.add('active');
  },

  startSignupResendTimer() {
    let timeLeft = 60;
    const wrapper = document.getElementById('signupResendWrapper');
    
    if (!wrapper) return;
    
    wrapper.innerHTML = `Resend OTP in <span id="signupResendTimer" style="color: #00bcd4; font-weight: bold;">${timeLeft}</span> s`;
    
    if (this.signupTimerInterval) clearInterval(this.signupTimerInterval);
    
    this.signupTimerInterval = setInterval(() => {
      timeLeft--;
      const el = document.getElementById('signupResendTimer');
      if (el) el.innerText = timeLeft;
      
      if (timeLeft <= 0) {
        clearInterval(this.signupTimerInterval);
        wrapper.innerHTML = `<a href="#" onclick="Auth.resendSignupOtp(event)" style="color: var(--c-gold); font-weight: 500; text-decoration: none;">Resend OTP</a>`;
      }
    }, 1000);
  },
  
  async resendSignupOtp(e) {
    if (e) e.preventDefault();
    const email = this.signupPayload.email;
    if (!email) return;
    
    const wrapper = document.getElementById('signupResendWrapper');
    wrapper.innerHTML = `Sending...`;
    
    try {
      const res = await fetch('/api/auth-handler?action=signup-otp-send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email })
      });
      const data = await res.json();
      
      if (res.ok && data.success) {
        window.ShowAlert("OTP Resent Successfully!");
        this.startSignupResendTimer();
      } else {
        window.ShowAlert(data.error || 'Failed to resend verification code.');
        wrapper.innerHTML = `<a href="#" onclick="Auth.resendSignupOtp(event)" style="color: var(--c-gold); font-weight: 500; text-decoration: none;">Resend OTP</a>`;
      }
    } catch(err) {
      window.ShowAlert("Network error occurred.");
      wrapper.innerHTML = `<a href="#" onclick="Auth.resendSignupOtp(event)" style="color: var(--c-gold); font-weight: 500; text-decoration: none;">Resend OTP</a>`;
    }
  },

  showForgotRequest(e) {
    if (e) e.preventDefault();
    this.hideAllViews();
    setTimeout(() => {
      document.getElementById('view-forgot-request').classList.add('active');
    }, 600);
  },

  showForgotVerify(e) {
    if (e) e.preventDefault();
    this.hideAllViews();
    document.getElementById('view-forgot-verify').classList.add('active');
    this.startOtpTimer();
  },

  startOtpTimer() {
    if (this.otpInterval) clearInterval(this.otpInterval);
    let timeLeft = 60;
    const timerCount = document.getElementById('otpTimerCount');
    const timerWrapper = document.getElementById('otpTimerWrapper');
    const resendWrapper = document.getElementById('otpResendWrapper');
    
    timerWrapper.style.display = 'block';
    resendWrapper.style.display = 'none';
    timerCount.innerText = timeLeft;

    this.otpInterval = setInterval(() => {
      timeLeft--;
      if (timeLeft <= 0) {
        clearInterval(this.otpInterval);
        timerWrapper.style.display = 'none';
        resendWrapper.style.display = 'block';
      } else {
        timerCount.innerText = timeLeft;
      }
    }, 1000);
  },

  showForgotReset(e) {
    if (e) e.preventDefault();
    this.hideAllViews();
    setTimeout(() => {
      document.getElementById('view-forgot-reset').classList.add('active');
    }, 600);
  },

  showForgotSuccess() {
    this.hideAllViews();
    setTimeout(() => {
      document.getElementById('view-forgot-success').classList.add('active');
    }, 600);
  },

  hideAllViews() {
    document.querySelectorAll('.auth-view').forEach(view => {
      view.classList.remove('active');
    });
  },

  handleOtpInput(input, index) {
    if (input.value && index < 6) {
      input.nextElementSibling.focus();
    }
    // Auto submit if last box is filled
    if (index === 6 && input.value) {
      const form = input.closest('form');
      // Fire submit event
      if (form) {
        form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
      }
    }
  },

  handleOtpKeydown(e, input, index) {
    if (e.key === 'Backspace' && !input.value && index > 1) {
      // Move to previous box on backspace if empty
      input.previousElementSibling.focus();
    } else if (e.key === 'ArrowRight' && index < 6) {
      e.preventDefault();
      input.nextElementSibling.focus();
    } else if (e.key === 'ArrowLeft' && index > 1) {
      e.preventDefault();
      input.previousElementSibling.focus();
    }
  },

  handleOtpPaste(e) {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text/plain').trim();
    if (/^\d{1,6}$/.test(pastedData)) {
      const inputs = e.target.closest('.otp-container').querySelectorAll('.otp-box');
      for (let i = 0; i < pastedData.length; i++) {
        if (inputs[i]) {
          inputs[i].value = pastedData[i];
          inputs[i].focus();
        }
      }
      // If 6 digits pasted, trigger submit
      if (pastedData.length === 6) {
        const form = e.target.closest('form');
        if (form) {
          form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
        }
      }
    }
  },

  togglePassword(inputId = 'authPassword') {
    const input = document.getElementById(inputId);
    const btn = input.nextElementSibling;
    if (input.type === 'password') {
      input.type = 'text';
      btn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
    } else {
      input.type = 'password';
      btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 36 36" width="24" height="24" stroke="currentColor" stroke-width="2.54" stroke-linecap="round" stroke-linejoin="round"><path d="M32.711 11c-3.166 4.841-8.573 8.03-14.71 8.03-6.139 0-11.546-3.189-14.712-8.03M9.79 17.5l-3 5m8.5-3-1 5.5m12.5-7.5 3 5m-8.5-3 1 5.5"></path></svg>`;
    }
  },

  toggleCountryDropdown(el) {
    // Close other dropdowns first
    document.querySelectorAll('.country-dropdown-list').forEach(list => {
      if (list !== el.querySelector('.country-dropdown-list')) {
        list.classList.remove('active');
      }
    });
    const list = el.querySelector('.country-dropdown-list');
    list.classList.toggle('active');
  },

  selectCountry(e, code, flag) {
    e.stopPropagation();
    const select = e.target.closest('.custom-country-select');
    select.querySelector('.selected-flag').innerText = flag;
    select.querySelector('.country-dropdown-list').classList.remove('active');
    
    // Find the nearest input within the wrapper
    const input = select.closest('.phone-input-wrapper').querySelector('.phone-input');
    input.value = code + ' ';
    input.focus();
  },

  formatPhoneNumber(phone) {
    let num = phone.replace(/[^0-9+]/g, ''); // strip spaces, dashes
    if (num.startsWith('+')) return num;
    
    // Auto-detect Pakistani numbers starting with 03 or 3
    if (num.startsWith('03') && num.length === 11) {
      return '+92' + num.substring(1);
    }
    if (num.startsWith('3') && num.length === 10) {
      return '+92' + num;
    }
    
    return '+' + num;
  },

  // Forgot Password Flow Handlers
  forgotPassword(e) {
    if (e) e.preventDefault();
    this.showForgotRequest(e);
  },

  setupRecaptcha() {
    if (!window.recaptchaVerifier) {
      if (!document.getElementById('recaptcha-container')) {
        const div = document.createElement('div');
        div.id = 'recaptcha-container';
        document.body.appendChild(div);
      }
      window.recaptchaVerifier = new firebase.auth.RecaptchaVerifier('recaptcha-container', {
        'size': 'invisible'
      });
    }
  },

  setLoading(btn, isLoading) {
    if (isLoading) {
      document.body.style.cursor = 'wait';
      if (btn) {
        btn.dataset.originalText = btn.innerHTML;
        btn.innerHTML = 'Wait...';
        btn.disabled = true;
        btn.style.opacity = '0.7';
      }
    } else {
      document.body.style.cursor = 'default';
      if (btn) {
        btn.innerHTML = btn.dataset.originalText || 'Confirm';
        btn.disabled = false;
        btn.style.opacity = '1';
      }
    }
  },

  async handleForgotRequest(e) {
    e.preventDefault();
    const rawInput = document.getElementById('forgotInput').value;
    if (!rawInput) return;

    let input = rawInput.trim();
    if (!input.includes('@')) {
      input = this.formatPhoneNumber(input);
    } else {
      input = input.toLowerCase();
    }

    const btn = e.target.querySelector('button[type="submit"]');
    this.setLoading(btn, true);

    this.forgotContext = { account: input };

    try {
      const res = await fetch('/api/auth-handler?action=forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: input })
      });
      const data = await res.json();
      
      if (res.ok && data.success) {
        if (data.method === 'whatsapp') {
           window.ShowAlert(`${data.message}<br><br><a href="https://wa.me/923106845085?text=Hi, I need to reset my password for phone number: ${input}" target="_blank" style="background: #25D366; color: white; padding: 10px 20px; border-radius: 4px; text-decoration: none; display: inline-block; margin-top: 15px;">Reset via WhatsApp</a>`);
        } else {
           document.getElementById('forgotVerifyTarget').innerText = input;
           document.getElementById('forgotVerifyEmail').innerText = input;
           this.showForgotVerify(null);
        }
      } else {
        if (data.error === 'ACCOUNT_NOT_FOUND') {
          window.ShowAlert(`This account is not yet registered. Please sign up to register yourself.<br><br><button onclick="Auth.showSignup(event); if(window.CloseAlert) window.CloseAlert();" style="background: var(--c-gold); color: white; border: none; border-radius: 8px; padding: 12px 24px; font-size: 14px; font-weight: bold; cursor: pointer; width: 100%; margin-bottom: 8px; transition: background 0.3s;">Sign Up</button>`);
        } else {
          window.ShowAlert(data.error || "Failed to send reset request.");
        }
      }
    } catch(err) {
      window.ShowAlert("Network error occurred.");
    } finally {
      this.setLoading(btn, false);
    }
  },

  handleOtpInput(el, idx) {
    if (el.value.length === 1) {
      const next = el.nextElementSibling;
      if (next && next.classList.contains('otp-box')) {
        next.focus();
      }
    }
  },

  async handleForgotVerify(e) {
    e.preventDefault();
    const boxes = document.querySelectorAll('.otp-box');
    let otp = '';
    boxes.forEach(b => otp += b.value);
    
    if (otp.length < 6) {
      window.ShowAlert('Please enter the full 6-digit verification code.');
      return;
    }

    const btn = e.target.querySelector('button[type="submit"]');
    this.setLoading(btn, true);

    const isEmail = this.forgotContext.account.includes('@');

    try {
      if (isEmail) {
      // Verify via Vercel Backend (MongoDB)
      try {
        const res = await fetch('/api/auth-handler?action=forgot-password-verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ account: this.forgotContext.account, otp })
        });
        const data = await res.json();
        
        if (res.ok && data.success) {
          this.forgotContext.token = data.token;
          this.showForgotReset(null);
        } else {
          window.ShowToast(data.error || "Invalid verification code!", "error");
          const view = document.getElementById('view-forgot-verify');
          if (view) {
              const otpContainer = view.querySelector('.otp-container') || view;
              otpContainer.classList.remove('otp-shake');
              void otpContainer.offsetWidth; // force reflow
              otpContainer.classList.add('otp-shake');
              setTimeout(() => otpContainer.classList.remove('otp-shake'), 400);
              const inputs = view.querySelectorAll('.otp-box');
              inputs.forEach(input => input.value = '');
              if (inputs.length > 0) inputs[0].focus();
          }
        }
      } catch(err) {
        window.ShowAlert("Network error occurred.");
      }
    } else {
      // Verify via Firebase (Phone)
      if (!window.confirmationResult) {
        window.ShowAlert("Session expired. Please request a new OTP.");
        return;
      }
      
      try {
        const result = await window.confirmationResult.confirm(otp);
        // User signed in successfully via Firebase!
        const user = result.user;
        const idToken = await user.getIdToken();
        
        if (this.forgotContext.isSignupLogin) {
          // This was a WhatsApp Signup/Login flow
          const res = await fetch('/api/auth-handler?action=whatsapp-verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone: this.forgotContext.account, token: idToken, isFirebase: true })
          });
          const data = await res.json();
          
          if (res.ok && data.success) {
            this.currentUser = data.user;
            localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
            window.ShowAlert('Verification Successful! Welcome ' + (this.currentUser.name || 'User'));
            this.closeModal();
            this.checkAuth();
          } else {
            window.ShowAlert(data.error || 'Verification failed');
          }
        } else {
          // This was a Forgot Password flow
          // Pass the firebase idToken to our reset endpoint as proof
          this.forgotContext.token = idToken;
          this.forgotContext.isFirebase = true;
          this.showForgotReset(null);
        }
        
      } catch (error) {
        console.error(error);
        window.ShowToast(data.error || "Invalid verification code!", "error");
          const view = document.getElementById('view-forgot-verify');
          if (view) {
              const otpContainer = view.querySelector('.otp-container') || view;
              otpContainer.classList.remove('otp-shake');
              void otpContainer.offsetWidth; // force reflow
              otpContainer.classList.add('otp-shake');
              setTimeout(() => otpContainer.classList.remove('otp-shake'), 400);
              const inputs = view.querySelectorAll('.otp-box');
              inputs.forEach(input => input.value = '');
              if (inputs.length > 0) inputs[0].focus();
          }
        }
    } } finally {
      this.setLoading(btn, false);
    }
  },

  async handleForgotReset(e) {
    e.preventDefault();
    const newPassword = document.getElementById('forgotNewPassword').value;

    // Password Criteria Validation
    const lenValid = newPassword.length >= 8 && newPassword.length <= 20;
    const charValid = /[a-zA-Z]/.test(newPassword) && /[0-9]/.test(newPassword) && /[~.!@#$%^&*<>]/.test(newPassword);
    const onlyValidSymbols = /^[a-zA-Z0-9~.!@#$%^&*<>]+$/.test(newPassword);

    if (!lenValid || !charValid || !onlyValidSymbols) {
      window.ShowAlert("Please ensure your password meets all the required criteria.");
      return;
    }

    const btn = e.target.querySelector('button[type="submit"]');
    this.setLoading(btn, true);

    try {
      const res = await fetch('/api/auth-handler?action=forgot-password-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: this.forgotContext.token, password: newPassword })
      });
      const data = await res.json();
      
      if (res.ok && data.success) {
        this.currentUser = data.user;
        localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
        this.showForgotSuccess();
      } else {
        window.ShowAlert(data.error || "Failed to reset password.");
      }
    } catch(err) {
      window.ShowAlert("Network error occurred.");
    } finally {
      this.setLoading(btn, false);
    }
  },

  handlePasswordValidation(el) {
    const val = el.value;
    const lenValid = val.length >= 8 && val.length <= 20;
    const charValid = /[a-zA-Z]/.test(val) && /[0-9]/.test(val) && /[~.!@#$%^&*<>]/.test(val);
    const onlyValidSymbols = val.length > 0 && /[~.!@#$%^&*<>]/.test(val) && /^[a-zA-Z0-9~.!@#$%^&*<>]+$/.test(val);

    const cLen = document.getElementById('pw-criteria-len');
    const cChar = document.getElementById('pw-criteria-char');
    const cSym = document.getElementById('pw-criteria-sym');

    if (cLen) cLen.style.color = lenValid ? '#4caf50' : '';
    if (cChar) cChar.style.color = charValid ? '#4caf50' : '';
    if (cSym) cSym.style.color = onlyValidSymbols ? '#4caf50' : '';
  },

  finishForgotSuccess() {
    this.closeModal();
    this.checkAuth();
  },

  async login(e) {
    e.preventDefault();
    const email = document.getElementById('authEmail').value;
    const pwd = document.getElementById('authPassword').value;
    const remember = document.getElementById('authRemember').checked;
    
    if (!email || !pwd) return;

    const btn = e.target.querySelector('button[type="submit"]');
    this.setLoading(btn, true);

    // Validate identifier format
    const hasLetters = /[a-zA-Z]/.test(email);
    if (hasLetters) {
       const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
       if (!emailRegex.test(email)) {
          window.ShowAlert("Please enter a valid email address.");
          this.setLoading(btn, false);
          return;
       }
    } else {
       const phoneRegex = /^[\d\+\-\s()]+$/;
       if (!phoneRegex.test(email) || email.replace(/\D/g, '').length < 7) {
          window.ShowAlert("Please enter a valid phone number without letters.");
          this.setLoading(btn, false);
          return;
       }
    }

    try {
      const res = await fetch('/api/auth-handler?action=login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: pwd })
      });
      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        throw new Error(`API Error (${res.status}): ` + text.substring(0, 150));
      }
      
      if (res.ok && data.success) {
        this.currentUser = data.user;
        localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
        
        if (remember) {
          localStorage.setItem('rememberedEmail', email);
        } else {
          localStorage.removeItem('rememberedEmail');
        }

        window.ShowAlert('Login Successful! Welcome ' + this.currentUser.name);
        this.closeModal();
        this.checkAuth();
        window.location.href = '/portal.html';
      } else {
        if (data.error === 'NOT_FOUND') {
          window.ShowAlert(`The email or phone number you entered is not yet registered. Please sign up to register yourself.<br><br><button onclick="Auth.showSignup(event); if(window.CloseAlert) window.CloseAlert();" style="background: var(--c-gold); color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; margin-top: 15px;">Go to Sign Up</button>`);
        } else if (data.error === 'WRONG_PASSWORD') {
          window.ShowAlert("Incorrect password. Please try again.");
        } else {
          window.ShowAlert(data.error || 'Login API Failed: ' + JSON.stringify(data));
        }
      }
    } catch(err) {
      window.ShowAlert("Network error occurred during login: " + err.message);
    } finally {
      this.setLoading(btn, false);
    }
  },

  async registerUser(e) {
    e.preventDefault();
    const name = document.getElementById('signupName').value;
    const identifier = document.getElementById('signupIdentifier').value;
    const password = document.getElementById('signupPassword').value;

    if (!name || !identifier || !password) {
      window.ShowAlert('All fields are required.');
      return;
    }

    const btn = e.target.querySelector('button[type="submit"]');
    this.setLoading(btn, true);

    const hasLetters = /[a-zA-Z]/.test(identifier);
    if (hasLetters) {
       // Must be valid email
       const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
       if (!emailRegex.test(identifier)) {
          window.ShowAlert("Please enter a valid email address.");
          this.setLoading(btn, false);
          return;
       }
    } else {
       // Must not contain letters (allow numbers, +, -, spaces)
       const phoneRegex = /^[\d\+\-\s()]+$/;
       if (!phoneRegex.test(identifier) || identifier.replace(/\D/g, '').length < 7) {
          window.ShowAlert("Please enter a valid phone number without letters.");
          this.setLoading(btn, false);
          return;
       }
    }

    const isEmail = hasLetters;
    const payload = {
      name: name,
      password: password
    };

    if (isEmail) {
      payload.email = identifier;
    } else {
      payload.phone = this.formatPhoneNumber(identifier);
    }

    try {
      if (isEmail) {
        // Send OTP first
        const res = await fetch('/api/auth-handler?action=signup-otp-send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: identifier })
        });
        const data = await res.json();
        
        if (res.ok && data.success) {
          // Store payload for step 2
          this.signupPayload = payload;
          document.getElementById('signupVerifyEmail').innerText = identifier;
          this.showSignupVerify(null);
          this.startSignupResendTimer();
        } else if (data.error === 'ALREADY_EXISTS') {
          window.ShowAlert(`This email is already registered.<br><br><button onclick="Auth.showLogin(event); if(window.CloseAlert) window.CloseAlert();" style="background: var(--c-gold); color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; margin-top: 15px;">Go to Sign in</button>`);
        } else {
          window.ShowAlert(data.error || 'Failed to send verification code.');
        }
      } else {
        // Phone number registration (immediate)
        const res = await fetch('/api/auth-handler?action=register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        
        if (res.ok && data.success) {
          this.currentUser = data.user;
          localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
          this.closeModal();
          this.checkAuth();
          
          if (!this.currentUser.isVerified) {
             this.checkVerification();
          } else {
             window.ShowAlert('Registration Successful! Welcome ' + this.currentUser.name);
             window.location.href = '/portal.html';
          }
        } else if (data.error === 'ALREADY_EXISTS') {
          window.ShowAlert(`This phone number is already registered.<br><br><button onclick="Auth.showLogin(event); if(window.CloseAlert) window.CloseAlert();" style="background: var(--c-gold); color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; margin-top: 15px;">Go to Sign in</button>`);
        } else {
          window.ShowAlert(data.error || 'Registration Failed');
        }
      }
    } catch(err) {
      window.ShowAlert("Network error occurred during registration.");
    } finally {
      this.setLoading(btn, false);
    }
  },


  async handleSignupVerify(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    
    // Get OTP from inputs
    const view = document.getElementById('view-signup-verify');
    const inputs = view.querySelectorAll('.otp-box');
    let otp = '';
    inputs.forEach(input => otp += input.value);
    
    if (otp.length !== 6) {
      window.ShowAlert('Please enter the full 6-digit verification code.');
      return;
    }

    this.setLoading(btn, true);

    const payload = { ...this.signupPayload, otp: otp };

    try {
      const res = await fetch('/api/auth-handler?action=register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      
      if (res.ok && data.success) {
        this.currentUser = data.user;
        localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
        document.dispatchEvent(new CustomEvent('authStateChanged', { detail: this.currentUser }));
        this.closeModal();
        this.checkAuth();
        
        if (!this.currentUser.isVerified) {
           this.checkVerification();
        } else {
           window.ShowAlert('Registration Successful! Welcome ' + this.currentUser.name);
           window.location.href = '/portal.html';
        }
      } else {
        window.ShowToast(data.error || "Incorrect OTP. Please enter a valid OTP.", "error");
        const view = document.getElementById('view-signup-verify');
        const otpContainer = view.querySelector('.otp-container') || view;
              otpContainer.classList.remove('otp-shake');
              void otpContainer.offsetWidth; // force reflow
              otpContainer.classList.add('otp-shake');
              setTimeout(() => otpContainer.classList.remove('otp-shake'), 400);
        const inputs = view.querySelectorAll('.otp-box');
        inputs.forEach(input => input.value = '');
        inputs[0].focus();
      }
    } catch(err) {
      window.ShowAlert("Network error occurred during verification.");
    } finally {
      this.setLoading(btn, false);
    }
  },
  checkVerification() {
    if (this.currentUser && !this.currentUser.isVerified) {
      this.showVerificationModal();
    }
  },

  redirectToSignup(e) {
    if (e) e.preventDefault();
    if (window.CloseAlert) window.CloseAlert(); // Dismiss underlying welcome alerts!
    this.currentUser = null;
    localStorage.removeItem('currentUser');
    this.checkAuth();
    const vModal = document.getElementById('verificationModal');
    if (vModal) vModal.remove();
    this.openModal();
    setTimeout(() => {
      this.showSignup(null);
    }, 50);
  },

  showVerificationModal() {
    if (window.CloseAlert) window.CloseAlert(); // Dismiss underlying welcome alerts!
    let vModal = document.getElementById('verificationModal');
    if (!vModal) {
      vModal = document.createElement('div');
      vModal.id = 'verificationModal';
      vModal.style.cssText = `
        position: fixed; inset: 0; background: rgba(0,0,0,0.4); backdrop-filter: blur(4px);
        z-index: 9999; display: flex; align-items: center; justify-content: center;
      `;
      const accountIdentifier = this.currentUser.email || this.currentUser.phone || "my account";
      vModal.innerHTML = `
        <div style="background: white; padding: 32px; border-radius: 16px; box-shadow: 0 20px 40px rgba(0,0,0,0.2); width: 90%; max-width: 400px; text-align: center;">
          <h3 style="margin-top:0; font-family: 'Playfair Display', serif; font-size: 24px; font-weight: 700; color: #0d2247; margin-bottom: 12px;">WhatsApp Verification Required</h3>
          <p style="color: #666; line-height: 1.6; margin-bottom: 24px; font-family: 'Inter', sans-serif; font-size: 14px;">Your account needs to be verified by our team before you can place orders. Please click below to send us a message on WhatsApp so we can verify your account.</p>
          <a href="https://wa.me/923106845085?text=${encodeURIComponent('Hi, I would like to verify my account.\n\nEmail/Phone: ' + accountIdentifier + '\n\nPlease verify my account so I can place my order. Thank you!')}" target="_blank" style="background: #25D366; color: white; border: none; border-radius: 8px; padding: 14px 24px; font-size: 15px; font-weight: bold; cursor: pointer; display: inline-block; text-decoration: none; width: 100%; box-sizing: border-box; margin-bottom: 20px; transition: background 0.3s; font-family: 'Inter', sans-serif;">Verify via WhatsApp</a>
          <div style="display: flex; justify-content: space-between; align-items: center; width: 100%; border-top: 1px solid #eaeaea; padding-top: 16px;">
            <button onclick="document.getElementById('verificationModal').remove()" style="background: transparent; color: #666; border: none; cursor: pointer; text-decoration: underline; padding: 8px; font-size: 13px; font-weight: 500; font-family: 'Inter', sans-serif;">I'll do it later</button>
            <a href="#" onclick="Auth.redirectToSignup(event)" style="background: transparent; color: var(--c-primary, #0d2247); border: none; cursor: pointer; text-decoration: underline; padding: 8px; font-size: 13px; font-weight: 600; font-family: 'Inter', sans-serif;">Or Sign up with email</a>
          </div>
        </div>
      `;
      document.body.appendChild(vModal);
    }
  },

  async logout() {
    // 1. Mark the session as logged-out so the proactive /me sync is skipped on next page load
    sessionStorage.setItem('nss_logged_out', '1');

    // 2. Wipe every auth key from localStorage
    this.currentUser = null;
    ['currentUser', 'rememberedEmail'].forEach(k => localStorage.removeItem(k));

    // 3. Belt-and-suspenders: try to delete cookie client-side too
    //    (works for non-httpOnly cookies; httpOnly ones are handled server-side)
    document.cookie = 'auth_token=; Max-Age=0; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    document.cookie = 'auth_token=; Max-Age=0; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; Secure';

    // 4. Tell server to expire the httpOnly cookie
    try {
      await fetch('/api/auth-handler?action=logout', { credentials: 'same-origin' });
    } catch (e) {
      console.error('Failed to log out from server:', e);
    }

    // 5. Show confirmation then hard-navigate (forces full browser reload with cleared cookies)
    window.ShowAlert('You have successfully logged out.');
    const isProtectedPage = window.location.pathname.includes('portal.html') || window.location.pathname.includes('checkout.html');
    setTimeout(() => {
      window.location.href = isProtectedPage ? '/index.html' : window.location.pathname + '?logged_out=1';
    }, 1200);
  },

  checkAuth() {
    const saved = localStorage.getItem('currentUser');
    if (saved) {
      this.currentUser = JSON.parse(saved);
    }

    const loginBtns = document.querySelectorAll('.nav-login-btn');
    const cartBtns = document.querySelectorAll('.nav-cart-btn');

    if (this.currentUser) {
      // User is logged in
      loginBtns.forEach(btn => {
        btn.textContent = 'My Account';
        btn.title = "Manage Account";
        btn.onclick = (e) => {
          e.preventDefault();
          e.stopPropagation();
          const drop = document.getElementById('studioAccountDropdown');
          if (!drop) return;
          
          if (drop.classList.contains('active')) {
            drop.classList.remove('active');
            setTimeout(() => drop.style.display = 'none', 200);
            return;
          }
          
          drop.style.display = 'flex';
          const rect = btn.getBoundingClientRect();
          drop.style.top = (rect.bottom + window.scrollY + 10) + 'px';
          
          if (window.innerWidth < 768) {
             drop.style.left = '50%';
             drop.style.transform = 'translateX(-50%)';
             drop.style.width = '90%';
          } else {
             drop.style.left = (rect.right + window.scrollX - 260) + 'px';
             drop.style.transform = 'none';
             drop.style.width = '260px';
          }
          
          setTimeout(() => drop.classList.add('active'), 10);
        };
      });
      cartBtns.forEach(btn => btn.style.display = '');
    } else {
      // User is NOT logged in
      loginBtns.forEach(btn => {
        btn.textContent = 'Login';
        btn.onclick = (e) => { e.preventDefault(); Auth.openModal(); };
        btn.title = "";
      });
      // Do not completely hide cart btns, because we want them to trigger the login modal when clicked
      cartBtns.forEach(btn => btn.style.display = '');
    }

    if (typeof Cart !== 'undefined') {
      Cart.updateCartCount();
    }

    // Broadcast auth state change so pages like Portal can react instantly
    document.dispatchEvent(new CustomEvent('authStateChanged', { detail: this.currentUser }));
  }
};

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
  Auth.init();
});


