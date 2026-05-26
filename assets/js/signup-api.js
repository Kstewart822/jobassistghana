/**
 * JobAssist Signup API Integration
 * Handles candidate and employer registration via backend API
 */

(function() {
  /**
   * Register candidate account
   */
  async function registerCandidate(candidateData, passportImage = null) {
    const payload = {
      email: candidateData.email,
      password: candidateData.password,
      confirmPassword: candidateData.password, // Already confirmed in frontend
      name: candidateData.fullName,
      role: 'candidate',
      // Additional candidate info
      phone: candidateData.phone,
      gender: candidateData.gender,
      dateOfBirth: candidateData.dateOfBirth || null,
      nssNumber: candidateData.nssNumber || null,
      isShsGraduate: candidateData.isShsGraduate || false,
      ghanaCard: candidateData.ghanaCard,
      digitalAddress: candidateData.digitalAddress || null,
      region: candidateData.region,
      willingToRelocate: candidateData.workOutside === 'Yes',
      fieldOfStudy: candidateData.fieldOfStudy,
      highestEducationLevel: candidateData.highestEducationLevel,
      preferredIndustry: candidateData.preferredIndustry,
      experienceLevel: candidateData.experience,
      skills: Array.isArray(candidateData.skills) ? candidateData.skills : [],
      disability: candidateData.disabled || 'No'
    };

    // Call backend API
    const result = await window.JobAssistAPI.Auth.register(payload);

    if (result.success && result.data?.data) {
      // Store tokens and user data
      const { accessToken, refreshToken, user } = result.data.data;
      window.JobAssistAPI.storeAuthData(accessToken, refreshToken, user);

      // Handle profile picture upload if provided
      if (passportImage) {
        // Profile picture can be uploaded as a separate call or in a follow-up
        console.log('Profile picture available for upload');
      }

      return {
        success: true,
        user,
        data: result.data
      };
    }

    return {
      success: false,
      message: result.message,
      errors: result.errors,
      data: result.data
    };
  }

  /**
   * Register employer account
   */
  async function registerEmployer(employerData) {
    const payload = {
      email: employerData.workEmail,
      password: employerData.password,
      confirmPassword: employerData.password, // Already confirmed in frontend
      name: employerData.fullName,
      role: 'employer',
      // Additional employer info
      companyName: employerData.companyName,
      industry: employerData.industry,
      businessType: employerData.businessType,
      companySize: employerData.companySize,
      registrationNumber: employerData.registrationNumber || null,
      contactPerson: employerData.fullName,
      contactPosition: employerData.position,
      phone: employerData.phone,
      companyAddress: employerData.companyAddress,
      region: employerData.region,
      city: employerData.city,
      description: employerData.companyDescription || null,
      website: employerData.website || null,
      socialLinks: employerData.socialMediaLinks || []
    };

    // Call backend API
    const result = await window.JobAssistAPI.Auth.register(payload);

    if (result.success && result.data?.data) {
      // Store tokens and user data
      const { accessToken, refreshToken, user } = result.data.data;
      window.JobAssistAPI.storeAuthData(accessToken, refreshToken, user);

      return {
        success: true,
        user,
        data: result.data
      };
    }

    return {
      success: false,
      message: result.message,
      errors: result.errors,
      data: result.data
    };
  }

  /**
   * Get candidate signup data from sessionStorage
   */
  function getCandidateSignupData() {
    try {
      const data = sessionStorage.getItem('jobassist_candidate_signup_temp');
      return data ? JSON.parse(data) : {};
    } catch (error) {
      console.error('Error reading candidate signup data:', error);
      return {};
    }
  }

  /**
   * Get employer signup data from sessionStorage
   */
  function getEmployerSignupData() {
    try {
      const data = localStorage.getItem('jobassist_employer_signup_temp');
      return data ? JSON.parse(data) : {};
    } catch (error) {
      console.error('Error reading employer signup data:', error);
      return {};
    }
  }

  /**
   * Get candidate profile picture from sessionStorage
   */
  function getCandidateProfilePicture() {
    try {
      return sessionStorage.getItem('jobassist_passport_temp') || null;
    } catch (error) {
      console.error('Error reading candidate profile picture:', error);
      return null;
    }
  }

  /**
   * Clear signup session data
   */
  function clearSignupData(userType = 'candidate') {
    try {
      if (userType === 'candidate') {
        sessionStorage.removeItem('jobassist_candidate_signup_temp');
        sessionStorage.removeItem('jobassist_passport_temp');
        sessionStorage.removeItem('jobassist_candidate_signup_image');
        localStorage.removeItem('signupType');
      } else {
        localStorage.removeItem('jobassist_employer_signup_temp');
        localStorage.removeItem('companyName');
        localStorage.removeItem('industry');
        localStorage.removeItem('businessType');
        localStorage.removeItem('companySize');
        localStorage.removeItem('registrationNumber');
        localStorage.removeItem('fullName');
        localStorage.removeItem('position');
        localStorage.removeItem('workEmail');
        localStorage.removeItem('phone');
        localStorage.removeItem('loginPhone');
        localStorage.removeItem('password');
        localStorage.removeItem('companyAddress');
        localStorage.removeItem('city');
        localStorage.removeItem('region');
        localStorage.removeItem('cityRegion');
        localStorage.removeItem('companyDescription');
        localStorage.removeItem('signupType');
      }
    } catch (error) {
      console.error('Error clearing signup data:', error);
    }
  }

  /**
   * Validate candidate signup data before submission
   */
  function validateCandidateData(data) {
    const errors = {};

    if (!data.email) errors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      errors.email = 'Invalid email format';
    }

    if (!data.password) errors.password = 'Password is required';
    else if (data.password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    }

    if (!data.fullName) errors.fullName = 'Full name is required';

    if (!data.phone) errors.phone = 'Phone number is required';

    if (!data.gender) errors.gender = 'Gender is required';

    if (!data.ghanaCard) errors.ghanaCard = 'Ghana Card number is required';

    if (!data.region) errors.region = 'Region is required';

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }

  /**
   * Validate employer signup data before submission
   */
  function validateEmployerData(data) {
    const errors = {};

    if (!data.workEmail) errors.workEmail = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.workEmail)) {
      errors.workEmail = 'Invalid email format';
    }

    if (!data.password) errors.password = 'Password is required';
    else if (data.password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    }

    if (!data.fullName) errors.fullName = 'Full name is required';

    if (!data.companyName) errors.companyName = 'Company name is required';

    if (!data.industry) errors.industry = 'Industry is required';

    if (!data.phone) errors.phone = 'Phone number is required';

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }

  /**
   * Expose signup API globally
   */
  window.JobAssistSignupAPI = {
    registerCandidate,
    registerEmployer,
    getCandidateSignupData,
    getEmployerSignupData,
    getCandidateProfilePicture,
    clearSignupData,
    validateCandidateData,
    validateEmployerData
  };

  console.log('JobAssist Signup API loaded');
})();
