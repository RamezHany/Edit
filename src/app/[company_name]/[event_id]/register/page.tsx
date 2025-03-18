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
    
    // Apply theme to document body
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

  // Toggle theme function
  const toggleTheme = () => {
    setTheme((prevTheme: 'dark' | 'light') => prevTheme === 'dark' ? 'light' : 'dark');
  };

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
    <div className={`min-h-screen relative overflow-hidden bg-white text-gray-800`}>
      {/* Add CSS for theme transitions */}
      <style jsx global>{`
        body {
          transition: background-color 0.3s ease, color 0.3s ease;
          color: #333;
          background-color: #ffffff;
        }
        
        .transition-colors {
          transition: background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease;
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
      
      {/* Static background */}
      <div className="absolute top-0 left-0 w-full h-full bg-blue-50/30"></div>

      {event?.image && (
        <div className="w-full h-56 md:h-72 relative overflow-hidden">
          {/* Main image */}
          <div className="absolute inset-0 z-10">
            <Image
              src={event.image}
              alt={`${companyName} - ${eventId} Event`}
              fill
              objectFit="cover"
              objectPosition="center"
              priority
            />
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-blue-900/80 via-blue-900/40 to-blue-500/20"></div>
          </div>
          
          {/* Event info */}
          <div className="absolute bottom-0 left-0 w-full p-4 md:p-6 z-30">
            <div className="max-w-4xl mx-auto">
              <h1 className="text-2xl md:text-4xl font-bold mb-1 text-white drop-shadow-sm">{event?.name}</h1>
              <h2 className="text-base md:text-xl text-white/90 flex items-center">
                Hosted by {companyName}
              </h2>
            </div>
          </div>
        </div>
      )}
      
      {/* Form container with improved spacing and subtle shadow */}
      <div className="w-[95%] md:w-[90%] lg:w-[70%] mx-auto bg-white rounded-lg shadow-sm border border-gray-100 relative z-30 max-w-4xl"
           style={{ marginTop: event?.image ? "-1rem" : "2rem" }}>
        <div className="p-6 md:p-8 relative">
          
          {/* Header (when no image) */}
          {!event?.image && (
            <>
              <h1 className="text-2xl md:text-3xl font-bold mb-2 text-gray-800 relative">
                Register for {event?.name}
                <span className="absolute bottom-0 left-0 w-16 h-1 bg-blue-500 rounded"></span>
              </h1>
              <h2 className="text-lg text-gray-600 mb-6">
                Hosted by {companyName}
              </h2>
            </>
          )}
          
          {/* Success or Form Content */}
          {success ? (
            <div className="text-center text-gray-800">
              <div className="bg-blue-50 border border-blue-100 px-6 py-8 rounded-lg mb-6 relative">
                <div className="flex flex-col items-center">
                  <div className="w-20 h-20 bg-blue-500 rounded-full flex items-center justify-center mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p className="font-bold text-xl text-gray-900">Registration Successful</p>
                  <p className="text-gray-600 mt-1">Thank you for registering for this event</p>
                </div>
              </div>
              
              {/* Event Details */}
              <div className="mb-6 text-left p-6 border border-gray-100 rounded-lg">
                <h3 className="text-lg font-semibold mb-4 text-gray-800">Event Details</h3>
                <p className="mb-3 text-gray-700 flex items-start">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span>
                    <span className="font-medium block text-gray-900">Date</span>
                    {event?.date ? new Date(event.date).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    }) : 'Date not specified'}
                  </span>
                </p>
                <p className="text-gray-700 flex items-start">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>
                    <span className="font-medium block text-gray-900">Description</span>
                    {event?.description || 'No description available.'}
                  </span>
                </p>
              </div>
              
              <div className="flex justify-center">
                <Link
                  href={`/${companyName}/${eventId}`}
                  className="px-6 py-3 bg-blue-500 text-white font-medium rounded-md hover:bg-blue-600 transition-colors duration-200 inline-flex items-center"
                >
                  Return to Event
                  <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path>
                  </svg>
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6 relative">
              {/* Error notification */}
              {error && (
                <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-r">
                  <div className="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <p className="text-red-700">{error}</p>
                  </div>
                </div>
              )}
              
              {/* Form section with improved typography and spacing */}
              <div className="space-y-6">
                {/* Personal Information Section */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-4 text-gray-800 border-b border-gray-200 pb-2">
                    Personal Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Name */}
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                      <input type="text" name="name" id="name"
                             className="block w-full px-4 py-3 text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                             placeholder="Your full name" value={formData.name}
                             onChange={handleChange}
                             disabled={submitting} required/>
                      {formErrors.name && (
                          <p className="text-red-500 text-xs mt-1">
                            {formErrors.name}
                          </p>
                      )}
                    </div>

                    {/* Phone */}
                    <div>
                      <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                      <input type="text" name="phone" id="phone"
                             className="block w-full px-4 py-3 text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                             placeholder="Your phone number" value={formData.phone}
                             onChange={handleChange}
                             disabled={submitting} required/>
                      {formErrors.phone && (
                          <p className="text-red-500 text-xs mt-1">
                            {formErrors.phone}
                          </p>
                      )}
                    </div>
                    
                    {/* Email */}
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                      <input type="email" name="email" id="email"
                             className="block w-full px-4 py-3 text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                             placeholder="Your email address" value={formData.email}
                             onChange={handleChange}
                             disabled={submitting} required/>
                      {formErrors.email && (
                          <p className="text-red-500 text-xs mt-1">
                            {formErrors.email}
                          </p>
                      )}
                    </div>
                    
                    {/* Age */}
                    <div>
                      <label htmlFor="age" className="block text-sm font-medium text-gray-700 mb-1">Age</label>
                      <input type="text" name="age" id="age"
                             className="block w-full px-4 py-3 text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                             placeholder="Your age" value={formData.age}
                             onChange={handleChange}
                             disabled={submitting} required/>
                      {formErrors.age && (
                          <p className="text-red-500 text-xs mt-1">
                            {formErrors.age}
                          </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* National ID */}
                <div className="mb-6">
                  <label htmlFor="nationalId" className="block text-sm font-medium text-gray-700 mb-1">National ID</label>
                  <input type="text" name="nationalId" id="nationalId"
                         className="block w-full px-4 py-3 text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                         placeholder="Your national ID" value={formData.nationalId}
                         onChange={handleChange}
                         disabled={submitting} required/>
                  {formErrors.nationalId && (
                      <p className="text-red-500 text-xs mt-1">
                        {formErrors.nationalId}
                      </p>
                  )}
                  <p className="text-gray-500 text-xs mt-1 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    Your National ID will only be visible to administrators
                  </p>
                </div>

                {/* Educational Information Section */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-4 text-gray-800 border-b border-gray-200 pb-2">
                    Educational Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* University */}
                    <div>
                      <label htmlFor="university" className="block text-sm font-medium text-gray-700 mb-1">University</label>
                      <input type="text" name="university" id="university"
                             className="block w-full px-4 py-3 text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                             placeholder="Your university" value={formData.university}
                             onChange={handleChange}
                             disabled={submitting} required/>
                      {formErrors.university && (
                          <p className="text-red-500 text-xs mt-1">
                            {formErrors.university}
                          </p>
                      )}
                    </div>
                    
                    {/* College */}
                    <div>
                      <label htmlFor="college" className="block text-sm font-medium text-gray-700 mb-1">College</label>
                      <input type="text" name="college" id="college"
                             className="block w-full px-4 py-3 text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                             placeholder="Your college" value={formData.college}
                             onChange={handleChange}
                             disabled={submitting} required/>
                      {formErrors.college && (
                          <p className="text-red-500 text-xs mt-1">
                            {formErrors.college}
                          </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Gender and Status Section */}
                <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Gender */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">Gender</label>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="relative">
                        <input
                            type="radio"
                            id="gender-male"
                            name="gender"
                            value="male"
                            checked={formData.gender === "male"}
                            onChange={handleChange}
                            disabled={submitting}
                            className="sr-only"
                        />
                        <label htmlFor="gender-male" 
                               className={`flex items-center justify-center p-3 border ${formData.gender === "male" ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white border-gray-300 text-gray-700'} rounded-md cursor-pointer hover:bg-gray-50 transition-colors`}>
                          <span className="text-sm font-medium">Male</span>
                        </label>
                      </div>
                      <div className="relative">
                        <input
                            type="radio"
                            id="gender-female"
                            name="gender"
                            value="female"
                            checked={formData.gender === "female"}
                            onChange={handleChange}
                            disabled={submitting}
                            className="sr-only"
                        />
                        <label htmlFor="gender-female" 
                               className={`flex items-center justify-center p-3 border ${formData.gender === "female" ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white border-gray-300 text-gray-700'} rounded-md cursor-pointer hover:bg-gray-50 transition-colors`}>
                          <span className="text-sm font-medium">Female</span>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Status */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">Status</label>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="relative">
                        <input
                            type="radio"
                            id="status-student"
                            name="status"
                            value="student"
                            checked={formData.status === "student"}
                            onChange={handleChange}
                            disabled={submitting}
                            className="sr-only"
                        />
                        <label htmlFor="status-student" 
                               className={`flex items-center justify-center p-3 border ${formData.status === "student" ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white border-gray-300 text-gray-700'} rounded-md cursor-pointer hover:bg-gray-50 transition-colors`}>
                          <span className="text-sm font-medium">Student</span>
                        </label>
                      </div>
                      <div className="relative">
                        <input
                            type="radio"
                            id="status-graduate"
                            name="status"
                            value="graduate"
                            checked={formData.status === "graduate"}
                            onChange={handleChange}
                            disabled={submitting}
                            className="sr-only"
                        />
                        <label htmlFor="status-graduate" 
                               className={`flex items-center justify-center p-3 border ${formData.status === "graduate" ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white border-gray-300 text-gray-700'} rounded-md cursor-pointer hover:bg-gray-50 transition-colors`}>
                          <span className="text-sm font-medium">Graduate</span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Submit Button */}
                <div className="mt-8">
                  <button
                    type="submit"
                    className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                    disabled={submitting}
                  >
                    {submitting ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Processing...
                      </>
                    ) : (
                      'Complete Registration'
                    )}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
        
        {/* IllustraV footer */}
        <div className="py-4 px-6 text-center border-t border-gray-100">
          <div className="text-xs text-gray-400">
            Powered by <span className="font-medium text-gray-500">illustraV</span>
          </div>
        </div>
      </div>
    </div>
  );
} 