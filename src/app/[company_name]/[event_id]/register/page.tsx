'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';

interface FormData {
  name: string;
  phone: string;
  email: string;
  gender: 'male' | 'female';
  college: string;
  status: 'student' | 'graduate';
  nationalId: string;
  age: string;
  university: string;
}

interface FormErrors {
  name?: string;
  phone?: string;
  email?: string;
  college?: string;
  nationalId?: string;
  age?: string;
  university?: string;
}

interface Event {
  id: string;
  name: string;
  image: string | null;
  description: string;
  date: string;
  registrations: number;
  status?: string;
  companyStatus?: string;
}

export default function EventRegistrationPage() {
  const params = useParams();
  // Decode URL-encoded parameters
  const companyName = decodeURIComponent(params.company_name as string);
  const eventId = decodeURIComponent(params.event_id as string);
  
  const [formData, setFormData] = useState<FormData>({
    name: '',
    phone: '',
    email: '',
    gender: 'male',
    college: '',
    status: 'student',
    nationalId: '',
    age: '',
    university: '',
  });
  
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [event, setEvent] = useState<Event | null>(null);
  const [eventDisabled, setEventDisabled] = useState(false);
  const [companyDisabled, setCompanyDisabled] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  // Get the theme from localStorage on component mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'dark' | 'light' | null;
    if (savedTheme) {
      setTheme(savedTheme);
    } else if (window.matchMedia('(prefers-color-scheme: light)').matches) {
      setTheme('light');
    }
  }, []);

  // Update localStorage when theme changes
  useEffect(() => {
    localStorage.setItem('theme', theme);
    document.documentElement.classList.toggle('light-theme', theme === 'light');
    
    // Apply theme to document body - set light mode as default
    if (typeof document !== 'undefined') {
      if (theme === 'light') {
        document.body.classList.add('light-theme');
        document.body.classList.remove('dark-theme');
      } else {
        document.body.classList.add('dark-theme');
        document.body.classList.remove('light-theme');
      }
    }
  }, [theme]);

  // Set light mode as default theme
  useEffect(() => {
    setTheme('light');
  }, []);

  useEffect(() => {
    // Fetch event details to verify it exists and get the image
    const fetchEventDetails = async () => {
      try {
        setLoading(true);
        console.log('Fetching events for company:', companyName);
        console.log('Event ID from URL (exact):', eventId);
        
        const response = await fetch(`/api/events?company=${encodeURIComponent(companyName)}`);
        
        if (!response.ok) {
          // Check if the company is disabled
          if (response.status === 403) {
            setCompanyDisabled(true);
            throw new Error('Company is disabled');
          }
          throw new Error('Failed to fetch event details');
        }
        
        const data = await response.json();
        console.log('Events received:', data.events);
        
        // Find the event that matches (case insensitive)
        const normalizedEventId = eventId.trim().toLowerCase();
        const foundEvent = data.events.find(
          (e: Event) => e.id.trim().toLowerCase() === normalizedEventId
        );
        
        if (!foundEvent) {
          console.error('Event not found:', { eventId, availableEvents: data.events.map((e: Event) => e.id) });
          throw new Error('Event not found');
        }
        
        console.log('Found matching event:', foundEvent);
        setEvent(foundEvent);
        
        // Check if event is disabled
        if (foundEvent.status === 'disabled') {
          setEventDisabled(true);
        }
        
        // Check if company is disabled
        if (foundEvent.companyStatus === 'disabled') {
          setCompanyDisabled(true);
        }
      } catch (error) {
        console.error('Error fetching event details:', error);
        if (!companyDisabled) {
          setError('Event not found or registration is closed');
        }
      } finally {
        setLoading(false);
      }
    };
    
    fetchEventDetails();
  }, [companyName, eventId, companyDisabled]);

  const validateField = (name: string, value: string): string => {
    switch (name) {
      case 'name':
        return value.trim() === '' ? 'Full name is required' : '';
      case 'phone':
        return value.trim() === '' 
          ? 'Phone number is required' 
          : !/^\d{10,15}$/.test(value) 
            ? 'Invalid phone number format. Must be 10-15 digits' 
            : '';
      case 'email':
        return value.trim() === '' 
          ? 'Email is required' 
          : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) 
            ? 'Invalid email format' 
            : '';
      case 'college':
        return value.trim() === '' ? 'College name is required' : '';
      case 'nationalId':
        return value.trim() === '' ? 'National ID is required' : '';
      case 'age':
        return value.trim() === '' 
          ? 'Age is required' 
          : !/^\d9+$/.test(value) 
            ? 'Age must be a number' 
            : parseInt(value) < 16 || parseInt(value) > 80
              ? 'Age must be between 16 and 80' 
              : '';
      case 'university':
        return value.trim() === '' ? 'University name is required' : '';
      default:
        return '';
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    
    // Validate field on change
    const errorMessage = validateField(name, value);
    setFormErrors(prev => ({
      ...prev,
      [name]: errorMessage
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!event) {
      setError('Event information is missing. Please refresh the page and try again.');
      return;
    }
    
    // Check if event or company is disabled
    if (eventDisabled || companyDisabled) {
      setError('Registration is currently disabled for this event.');
      return;
    }
    
    // Validate all fields
    const errors: FormErrors = {};
    let hasErrors = false;
    
    Object.entries(formData).forEach(([key, value]) => {
      if (key === 'gender' || key === 'status') return; // Skip select fields
      
      const error = validateField(key, value as string);
      if (error) {
        errors[key as keyof FormErrors] = error;
        hasErrors = true;
      }
    });
    
    setFormErrors(errors);
    
    if (hasErrors) {
      return; // Stop form submission if there are errors
    }
    
    setSubmitting(true);
    setError('');
    
    try {
      // Use the original event ID from the URL
      console.log('Submitting registration with:', {
        companyName,
        eventName: eventId, // Use the exact event ID from the URL
        originalEventId: eventId,
        foundEventId: event.id
      });
      
      const response = await fetch('/api/events/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          companyName,
          eventName: eventId, // Use the exact event ID from the URL
          ...formData,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to register for event');
      }
      
      // Show success message
      setSuccess(true);
      
      // Reset form
      setFormData({
        name: '',
        phone: '',
        email: '',
        gender: 'male',
        college: '',
        status: 'student',
        nationalId: '',
        age: '',
        university: '',
      });
      setFormErrors({});
    } catch (error) {
      console.error('Error registering for event:', error);
      setError(error instanceof Error ? error.message : 'Failed to register for event');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-100'}`}>
        <div className={`text-xl ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>Loading...</div>
      </div>
    );
  }

  if (error && !submitting) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-100'}`}>
        <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} p-8 rounded-lg shadow-md w-full max-w-md text-center`}>
          <div className="text-red-500 text-xl mb-4">{error}</div>
          <Link href={`/${companyName}/${eventId}`} className="text-blue-500 hover:underline">
            Return to Event
          </Link>
        </div>
      </div>
    );
  }

  if (eventDisabled || companyDisabled) {
    return (
      <div className={`min-h-screen ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-100'} py-12 px-4 sm:px-6 lg:px-8`}>
        <div className={`max-w-md mx-auto ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-md overflow-hidden`}>
          <div className="p-6">
            <div className="flex items-center justify-center">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-red-600 mb-4">
                  {eventDisabled ? 'Registration Disabled' : 'Company Inactive'}
                </h2>
                <p className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'} mb-6`}>
                  {eventDisabled
                    ? 'Registration for this event is currently disabled. Please contact the organizer for more information.'
                    : 'This company\'s events are currently not available. Please contact the administrator for more information.'}
                </p>
                <Link
                  href={`/${companyName}/${eventId}`}
                  className="inline-block bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                >
                  Return to Event
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen relative overflow-hidden bg-gray-50`}>
      {/* Add CSS for theme transitions and Uber-style design */}
      <style jsx global>{`
        body {
          transition: background-color 0.3s ease, color 0.3s ease;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          color: #333333;
          background-color: #f8f9fa;
        }
        
        .form-label {
          font-size: 0.875rem;
          font-weight: 500;
          margin-bottom: 0.5rem;
          color: #505050;
          display: block;
        }
        
        .form-input {
          width: 100%;
          padding: 0.85rem 1rem;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
          background-color: white;
          transition: all 0.2s;
          font-size: 0.95rem;
        }
        
        .form-input:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 1px #3b82f6;
        }
        
        .form-input::placeholder {
          color: #a0aec0;
        }
        
        .section-title {
          font-size: 1.125rem;
          font-weight: 600;
          color: #2d3748;
          margin-bottom: 1.25rem;
          padding-bottom: 0.5rem;
          border-bottom: 1px solid #e2e8f0;
        }
        
        .radio-label {
          display: flex;
          align-items: center;
          padding: 0.75rem 1.25rem;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
          background-color: white;
          transition: all 0.2s;
          cursor: pointer;
        }
        
        .radio-label-selected {
          background-color: #ebf5ff;
          border-color: #bfdbfe;
        }
        
        .btn-primary {
          background-color: #1a56db;
          color: white;
          font-weight: 600;
          padding: 0.75rem 1.5rem;
          border-radius: 8px;
          transition: all 0.2s;
          border: none;
          cursor: pointer;
          width: 100%;
        }
        
        .btn-primary:hover {
          background-color: #1e429f;
        }
        
        /* Improved card shadow */
        .card-shadow {
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
        }

        @keyframes shine {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(100%);
          }
        }

        .animate-shine {
          animation: shine 3s infinite linear;
        }
      `}</style>
      
      {/* Main Content */}
      <div className="max-w-4xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
        
        {/* Header Section */}
        <header className="mb-10 text-center">
          <div className="mb-3">
            {companyName && (
              <div className="text-sm uppercase tracking-widest mb-1 font-medium text-blue-600">
                {companyName}
              </div>
            )}
            <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight">
              {event?.name || 'Event Registration'}
            </h1>
          </div>
          {event?.date && (
            <div className="text-sm text-gray-500 flex items-center justify-center">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {new Date(event.date).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </div>
          )}
        </header>
        
        {/* Form Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden card-shadow">
          {event?.image && (
            <div className="w-full h-64 relative">
              <Image
                src={event.image}
                alt={`${event.name} Event`}
                fill
                style={{ objectFit: 'cover' }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
              <div className="absolute bottom-0 left-0 w-full p-6">
                <h2 className="text-2xl font-bold text-white drop-shadow-sm">
                  Join us for this exclusive event
                </h2>
              </div>
            </div>
          )}
          
          <div className="p-6 md:p-8">
            {/* Loading State */}
            {loading && (
              <div className="py-12 flex justify-center items-center">
                <svg className="animate-spin h-8 w-8 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
            )}
            
            {/* Error State */}
            {error && !submitting && (
              <div className="py-12 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-6">
                  <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Registration Error</h3>
                <p className="text-gray-500 mb-6">{error}</p>
                <Link href={`/${companyName}/${eventId}`} className="text-blue-600 hover:text-blue-800 font-medium">
                  Return to Event
                </Link>
              </div>
            )}
            
            {/* Disabled Event State */}
            {(eventDisabled || companyDisabled) && (
              <div className="py-12 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-yellow-100 mb-6">
                  <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {eventDisabled ? 'Registration Disabled' : 'Company Inactive'}
                </h3>
                <p className="text-gray-500 mb-6">
                  {eventDisabled
                    ? 'Registration for this event is currently disabled. Please contact the organizer for more information.'
                    : 'This company\'s events are currently not available. Please contact the administrator for more information.'}
                </p>
                <Link
                  href={`/${companyName}/${eventId}`}
                  className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  Return to Event
                </Link>
              </div>
            )}
            
            {/* Success State */}
            {success && (
              <div className="py-10 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-6">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Registration Successful</h3>
                <p className="text-gray-600 mb-8">Thank you for registering for this event!</p>
                
                <div className="mb-8 text-left max-w-md mx-auto bg-blue-50 rounded-lg p-5">
                  <h4 className="font-medium text-gray-900 mb-3">Event Details</h4>
                  <p className="text-sm text-gray-600 mb-3">
                    <span className="font-medium">Date:</span> {event?.date ? new Date(event.date).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    }) : 'Date not specified'}
                  </p>
                  <p className="text-sm text-gray-600 whitespace-pre-line">
                    <span className="font-medium">Description:</span> {event?.description || 'No description available.'}
                  </p>
                </div>
                
                <Link
                  href={`/${companyName}/${eventId}`}
                  className="inline-flex items-center justify-center px-5 py-3 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-all duration-200"
                >
                  Return to Event
                </Link>
              </div>
            )}
            
            {/* Registration Form */}
            {!loading && !success && !eventDisabled && !companyDisabled && (
              <form onSubmit={handleSubmit} className="space-y-8">
                {/* Form Error */}
                {error && (
                  <div className="p-4 rounded-md bg-red-50 mb-6">
                    <div className="flex">
                      <svg className="h-5 w-5 text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <p className="text-sm text-red-700">{error}</p>
                    </div>
                  </div>
                )}
                
                {/* Personal Information */}
                <div>
                  <h3 className="section-title">Personal Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {/* Name */}
                    <div>
                      <label htmlFor="name" className="form-label">Full Name</label>
                      <input 
                        type="text" 
                        id="name" 
                        name="name" 
                        className="form-input" 
                        placeholder="Enter your full name" 
                        value={formData.name}
                        onChange={handleChange}
                        disabled={submitting}
                        required
                      />
                      {formErrors.name && (
                        <p className="mt-1 text-sm text-red-600">{formErrors.name}</p>
                      )}
                    </div>
                    
                    {/* Phone */}
                    <div>
                      <label htmlFor="phone" className="form-label">Phone Number</label>
                      <input 
                        type="text" 
                        id="phone" 
                        name="phone" 
                        className="form-input" 
                        placeholder="Enter your phone number" 
                        value={formData.phone}
                        onChange={handleChange}
                        disabled={submitting}
                        required
                      />
                      {formErrors.phone && (
                        <p className="mt-1 text-sm text-red-600">{formErrors.phone}</p>
                      )}
                    </div>
                    
                    {/* Email */}
                    <div>
                      <label htmlFor="email" className="form-label">Email Address</label>
                      <input 
                        type="email" 
                        id="email" 
                        name="email" 
                        className="form-input" 
                        placeholder="Enter your email address" 
                        value={formData.email}
                        onChange={handleChange}
                        disabled={submitting}
                        required
                      />
                      {formErrors.email && (
                        <p className="mt-1 text-sm text-red-600">{formErrors.email}</p>
                      )}
                    </div>
                    
                    {/* Age */}
                    <div>
                      <label htmlFor="age" className="form-label">Age</label>
                      <input 
                        type="text" 
                        id="age" 
                        name="age" 
                        className="form-input" 
                        placeholder="Enter your age" 
                        value={formData.age}
                        onChange={handleChange}
                        disabled={submitting}
                        required
                      />
                      {formErrors.age && (
                        <p className="mt-1 text-sm text-red-600">{formErrors.age}</p>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* National ID */}
                <div>
                  <label htmlFor="nationalId" className="form-label">National ID</label>
                  <input 
                    type="text" 
                    id="nationalId" 
                    name="nationalId" 
                    className="form-input" 
                    placeholder="Enter your national ID" 
                    value={formData.nationalId}
                    onChange={handleChange}
                    disabled={submitting}
                    required
                  />
                  {formErrors.nationalId && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.nationalId}</p>
                  )}
                  <p className="mt-1 text-xs text-gray-500 flex items-center">
                    <svg className="w-3 h-3 mr-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <span>Your National ID will only be visible to administrators.</span>
                  </p>
                </div>
                
                {/* Educational Information */}
                <div>
                  <h3 className="section-title">Educational Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {/* University */}
                    <div>
                      <label htmlFor="university" className="form-label">University</label>
                      <input 
                        type="text" 
                        id="university" 
                        name="university" 
                        className="form-input" 
                        placeholder="Enter your university" 
                        value={formData.university}
                        onChange={handleChange}
                        disabled={submitting}
                        required
                      />
                      {formErrors.university && (
                        <p className="mt-1 text-sm text-red-600">{formErrors.university}</p>
                      )}
                    </div>
                    
                    {/* College */}
                    <div>
                      <label htmlFor="college" className="form-label">College</label>
                      <input 
                        type="text" 
                        id="college" 
                        name="college" 
                        className="form-input" 
                        placeholder="Enter your college" 
                        value={formData.college}
                        onChange={handleChange}
                        disabled={submitting}
                        required
                      />
                      {formErrors.college && (
                        <p className="mt-1 text-sm text-red-600">{formErrors.college}</p>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Gender and Status */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Gender */}
                  <div>
                    <label className="form-label">Gender</label>
                    <div className="flex space-x-4">
                      <label className={`flex-1 radio-label ${formData.gender === 'male' ? 'radio-label-selected' : ''}`}>
                        <input
                          type="radio"
                          name="gender"
                          value="male"
                          className="sr-only"
                          checked={formData.gender === "male"}
                          onChange={handleChange}
                          disabled={submitting}
                        />
                        <span className={`${formData.gender === 'male' ? 'text-blue-800' : 'text-gray-700'}`}>Male</span>
                      </label>
                      <label className={`flex-1 radio-label ${formData.gender === 'female' ? 'radio-label-selected' : ''}`}>
                        <input
                          type="radio"
                          name="gender"
                          value="female"
                          className="sr-only"
                          checked={formData.gender === "female"}
                          onChange={handleChange}
                          disabled={submitting}
                        />
                        <span className={`${formData.gender === 'female' ? 'text-blue-800' : 'text-gray-700'}`}>Female</span>
                      </label>
                    </div>
                  </div>
                  
                  {/* Status */}
                  <div>
                    <label className="form-label">Status</label>
                    <div className="flex space-x-4">
                      <label className={`flex-1 radio-label ${formData.status === 'student' ? 'radio-label-selected' : ''}`}>
                        <input
                          type="radio"
                          name="status"
                          value="student"
                          className="sr-only"
                          checked={formData.status === "student"}
                          onChange={handleChange}
                          disabled={submitting}
                        />
                        <span className={`${formData.status === 'student' ? 'text-blue-800' : 'text-gray-700'}`}>Student</span>
                      </label>
                      <label className={`flex-1 radio-label ${formData.status === 'graduate' ? 'radio-label-selected' : ''}`}>
                        <input
                          type="radio"
                          name="status"
                          value="graduate"
                          className="sr-only"
                          checked={formData.status === "graduate"}
                          onChange={handleChange}
                          disabled={submitting}
                        />
                        <span className={`${formData.status === 'graduate' ? 'text-blue-800' : 'text-gray-700'}`}>Graduate</span>
                      </label>
                    </div>
                  </div>
                </div>
                
                {/* Submit Button */}
                <div className="pt-4">
                  <button
                    type="submit"
                    className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200"
                    disabled={submitting}
                  >
                    {submitting ? (
                      <div className="flex items-center">
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Processing...
                      </div>
                    ) : (
                      "Register Now"
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
        
        {/* Footer */}
        <div className="mt-10 text-center">
          <div className="inline-flex items-center justify-center text-xs text-gray-500">
            <svg className="w-3 h-3 mr-1 text-blue-500" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
              <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span>Powered by </span>
            <span className="font-medium text-blue-600 ml-1">illustraV</span>
          </div>
        </div>
      </div>
    </div>
  );
} 