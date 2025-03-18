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
          : !/^\d+$/.test(value) 
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
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  if (error && !submitting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md text-center">
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
      <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md mx-auto bg-white rounded-lg shadow-md overflow-hidden">
          <div className="p-6">
            <div className="flex items-center justify-center">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-red-600 mb-4">
                  {eventDisabled ? 'Registration Disabled' : 'Company Inactive'}
                </h2>
                <p className="text-gray-600 mb-6">
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
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-[#1f2937] to-blue-900 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-20 pointer-events-none">
        <div className="absolute w-24 h-24 bg-blue-500 rounded-full top-1/4 left-1/4 animate-pulse"></div>
        <div className="absolute w-16 h-16 bg-purple-500 rounded-full top-3/4 left-1/3 animate-ping"></div>
        <div className="absolute w-32 h-32 bg-pink-500 rounded-full bottom-1/4 right-1/4 animate-pulse"></div>
        <div className="absolute w-20 h-20 bg-yellow-500 rounded-full top-1/2 right-1/3 animate-bounce"></div>
      </div>
      
      {event?.image && (
        <div className="w-full h-56 md:h-80 relative overflow-hidden bg-gradient-to-b from-blue-900 to-purple-900">
          {/* Animated circles in background */}
          <div className="absolute inset-0 overflow-hidden z-0">
            <div className="absolute w-40 h-40 rounded-full bg-gradient-to-r from-pink-500/30 to-purple-500/30 -left-10 -top-10 animate-pulse"></div>
            <div className="absolute w-56 h-56 rounded-full bg-gradient-to-r from-blue-500/20 to-cyan-500/20 right-10 top-20 animate-pulse"></div>
            <div className="absolute w-32 h-32 rounded-full bg-gradient-to-r from-yellow-500/20 to-orange-500/20 bottom-5 left-1/4 animate-pulse"></div>
          </div>
          
          {/* Sparkling effect */}
          <div className="absolute inset-0 z-10 opacity-30">
            <div className="absolute w-2 h-2 rounded-full bg-white top-1/4 left-1/4 opacity-80 animate-pulse"></div>
            <div className="absolute w-1 h-1 rounded-full bg-white top-1/3 left-2/3 opacity-80 animate-ping"></div>
            <div className="absolute w-2 h-2 rounded-full bg-white top-2/3 left-1/2 opacity-80 animate-pulse"></div>
            <div className="absolute w-1 h-1 rounded-full bg-white top-3/4 left-1/5 opacity-80 animate-ping"></div>
            <div className="absolute w-2 h-2 rounded-full bg-white top-1/5 left-3/4 opacity-80 animate-pulse"></div>
            <div className="absolute w-1 h-1 rounded-full bg-white top-1/2 left-1/3 opacity-80 animate-ping"></div>
            <div className="absolute w-2 h-2 rounded-full bg-white top-2/5 left-4/5 opacity-80 animate-pulse"></div>
            <div className="absolute w-1 h-1 rounded-full bg-white top-4/5 left-2/5 opacity-80 animate-ping"></div>
            <div className="absolute w-2 h-2 rounded-full bg-white top-3/5 left-3/5 opacity-80 animate-pulse"></div>
            <div className="absolute w-1 h-1 rounded-full bg-white top-1/6 left-1/6 opacity-80 animate-ping"></div>
          </div>
          
          {/* Main image with effects */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20">
            <div className="relative">
              {/* Outer glow */}
              <div className="absolute -inset-3 bg-gradient-to-r from-purple-600 via-pink-500 to-blue-600 rounded-full blur-lg opacity-70 animate-spin"></div>
              
              {/* Image container */}
              <div className="h-40 w-40 md:h-56 md:w-56 rounded-full relative overflow-hidden border-4 border-white/50 shadow-2xl transform hover:scale-105 transition-all duration-500 group">
                <Image
                  src={event.image}
                  alt={`${companyName} - ${eventId} Event`}
                  fill
                  className="object-cover group-hover:scale-110 transition-all duration-700"
                />
                
                {/* Overlay on hover */}
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/70 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center p-4">
                  <p className="text-white text-sm md:text-base font-medium text-center">{event.name}</p>
                </div>
              </div>
              
              {/* Decorative circles */}
              <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-pink-500 shadow-lg animate-bounce"></div>
              <div className="absolute -bottom-2 -left-2 w-6 h-6 rounded-full bg-blue-500 shadow-lg animate-bounce delay-700"></div>
              <div className="absolute top-1/2 -right-4 w-4 h-4 rounded-full bg-purple-500 shadow-lg animate-ping"></div>
            </div>
          </div>
          
          {/* Event details at bottom */}
          <div className="absolute bottom-0 left-0 w-full p-6 text-white z-30 bg-gradient-to-t from-black/70 to-transparent">
            <div className="max-w-4xl mx-auto text-center">
              <h1 className="text-2xl md:text-4xl font-bold mb-1 drop-shadow-lg">{event?.name}</h1>
              <h2 className="text-lg md:text-2xl drop-shadow-md flex items-center justify-center">
                <span className="inline-block mr-2">✨</span>
                Hosted by {companyName}
                <span className="inline-block ml-2">✨</span>
              </h2>
            </div>
          </div>
          
          {/* Side decorative elements */}
          <div className="absolute -left-10 top-1/3 h-20 w-20 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 blur-xl opacity-50 animate-pulse"></div>
          <div className="absolute -right-10 top-2/3 h-24 w-24 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 blur-xl opacity-50 animate-pulse delay-1000"></div>
        </div>
      )}
      
      <div className="w-[95%] md:w-[80%] lg:w-[60%] mx-auto bg-[#353c49]/90 backdrop-blur-sm rounded-2xl shadow-2xl overflow-hidden my-4 md:my-6 hover:shadow-[0_0_30px_rgba(124,58,237,0.5)] transition-all duration-500 border border-purple-500/30">
        <div className="p-4 md:p-8 relative">
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-pink-500 to-purple-500 rounded-bl-full opacity-20"></div>
          <div className="absolute bottom-0 left-0 w-16 h-16 bg-gradient-to-tr from-blue-500 to-green-500 rounded-tr-full opacity-20"></div>
          
          {!event?.image && (
            <>
              <h1 className="text-xl md:text-3xl font-bold mb-1 md:mb-2 text-white relative inline-block">
                Register for {event?.name} ✨
                <span className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-pink-500 to-blue-500 rounded"></span>
              </h1>
              <h2 className="text-lg md:text-2xl text-gray-200 mb-4 md:mb-6">
                Hosted by {companyName} 🎉
              </h2>
            </>
          )}
          
          {success ? (
            <div className="text-center text-white">
              <div className="bg-green-700/80 backdrop-blur-sm border border-green-400 px-4 py-6 rounded-2xl mb-4 md:mb-6 relative overflow-hidden group">
                <div className="absolute -inset-1 bg-gradient-to-r from-green-400 to-emerald-400 rounded-lg blur opacity-25 group-hover:opacity-40 transition duration-500"></div>
                <div className="relative flex flex-col items-center">
                  <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mb-3 animate-bounce">
                    <span className="text-4xl">🎊</span>
                  </div>
                  <p className="font-bold text-xl">Registration Successful!</p>
                  <p className="text-lg">Thank you for registering for this event!</p>
                </div>
              </div>
              
              {/* Rest of success content */}
              <div className="mb-4">
                <h3 className="text-lg font-semibold mb-2">Event Details:</h3>
                <p className="text-white mb-2">
                  <span className="font-semibold">📅 Date:</span> {event?.date ? new Date(event.date).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  }) : 'Date not specified'}
                </p>
                <p className="text-white whitespace-pre-line">
                  <span className="font-semibold">📝 Description:</span> {event?.description || 'No description available.'}
                </p>
              </div>
              
              <div className="flex justify-center">
                <Link
                  href={`/${companyName}/${eventId}`}
                  className="relative inline-flex group items-center justify-center px-6 py-3 font-bold text-white transition-all duration-300 ease-in-out bg-gradient-to-br from-blue-600 to-purple-600 rounded-full overflow-hidden"
                >
                  <span className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-blue-500 to-purple-500 opacity-0 group-hover:opacity-100 transition-all duration-300 ease-in-out transform group-hover:scale-110"></span>
                  <span className="relative flex items-center">
                    Return to Event
                    <svg className="w-4 h-4 ml-2 transform group-hover:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path>
                    </svg>
                  </span>
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3 relative">
              {error && (
                <div className="bg-red-700/80 backdrop-blur-sm border border-red-400 text-white px-4 py-3 rounded-xl mb-4">
                  <div className="flex items-center">
                    <span className="text-2xl mr-2">⚠️</span>
                    <p>{error}</p>
                  </div>
                </div>
              )}

              {/* Personal Information Section */}
              <div className="mb-1 md:mb-2">
                <h3 className="text-base md:text-lg font-medium text-white mb-2 flex items-center">
                  <span className="w-8 h-8 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 flex items-center justify-center mr-2">👤</span>
                  <span className="relative">
                    Personal Information
                    <span className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-pink-500 to-transparent"></span>
                  </span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Name */}
                  <div className="relative group">
                    <div className="absolute -inset-1 bg-gradient-to-r from-pink-500/50 to-purple-500/50 rounded-lg blur opacity-25 group-hover:opacity-80 transition duration-500"></div>
                    <div className="relative">
                      <input type="text" name="name" id="name"
                            className="block w-full p-3 text-sm rounded-xl text-white bg-[#3b4251] border-none focus:outline-none focus:ring-2 focus:ring-purple-500 group-hover:bg-[#414958] transition-all duration-300"
                            placeholder="Name - الاسم 👋" value={formData.name}
                            onChange={handleChange}
                            disabled={submitting} required/>
                      {formErrors.name && (
                          <p className="text-red-400 text-xs italic mt-1 ml-2 flex items-center">
                            <span className="text-red-500 mr-1">⚠️</span> {formErrors.name}
                          </p>
                      )}
                    </div>
                  </div>

                  {/* Phone */}
                  <div className="relative group">
                    <div className="absolute -inset-1 bg-gradient-to-r from-blue-500/50 to-teal-500/50 rounded-lg blur opacity-25 group-hover:opacity-80 transition duration-500"></div>
                    <div className="relative">
                      <input type="text" name="phone" id="phone"
                            className="block w-full p-3 text-sm rounded-xl text-white bg-[#3b4251] border-none focus:outline-none focus:ring-2 focus:ring-blue-500 group-hover:bg-[#414958] transition-all duration-300"
                            placeholder="Phone - رقم الهاتف 📱" value={formData.phone}
                            onChange={handleChange}
                            disabled={submitting} required/>
                      {formErrors.phone && (
                          <p className="text-red-400 text-xs italic mt-1 ml-2 flex items-center">
                            <span className="text-red-500 mr-1">⚠️</span> {formErrors.phone}
                          </p>
                      )}
                    </div>
                  </div>
                  
                  {/* Email */}
                  <div className="relative group">
                    <div className="absolute -inset-1 bg-gradient-to-r from-purple-500/50 to-indigo-500/50 rounded-lg blur opacity-25 group-hover:opacity-80 transition duration-500"></div>
                    <div className="relative">
                      <input type="email" name="email" id="email"
                            className="block w-full p-3 text-sm rounded-xl text-white bg-[#3b4251] border-none focus:outline-none focus:ring-2 focus:ring-indigo-500 group-hover:bg-[#414958] transition-all duration-300"
                            placeholder="Email - البريد الإلكتروني 📧" value={formData.email}
                            onChange={handleChange}
                            disabled={submitting} required/>
                      {formErrors.email && (
                          <p className="text-red-400 text-xs italic mt-1 ml-2 flex items-center">
                            <span className="text-red-500 mr-1">⚠️</span> {formErrors.email}
                          </p>
                      )}
                    </div>
                  </div>
                  
                  {/* Age */}
                  <div className="relative group">
                    <div className="absolute -inset-1 bg-gradient-to-r from-yellow-500/50 to-orange-500/50 rounded-lg blur opacity-25 group-hover:opacity-80 transition duration-500"></div>
                    <div className="relative">
                      <input type="text" name="age" id="age"
                            className="block w-full p-3 text-sm rounded-xl text-white bg-[#3b4251] border-none focus:outline-none focus:ring-2 focus:ring-yellow-500 group-hover:bg-[#414958] transition-all duration-300"
                            placeholder="Age - العمر 🎂" value={formData.age}
                            onChange={handleChange}
                            disabled={submitting} required/>
                      {formErrors.age && (
                          <p className="text-red-400 text-xs italic mt-1 ml-2 flex items-center">
                            <span className="text-red-500 mr-1">⚠️</span> {formErrors.age}
                          </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* National ID */}
              <div className="relative group mb-3">
                <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500/50 to-emerald-500/50 rounded-lg blur opacity-25 group-hover:opacity-80 transition duration-500"></div>
                <div className="relative">
                  <input type="text" name="nationalId" id="nationalId"
                        className="block w-full p-3 text-sm rounded-xl text-white bg-[#3b4251] border-none focus:outline-none focus:ring-2 focus:ring-emerald-500 group-hover:bg-[#414958] transition-all duration-300"
                        placeholder="National ID - الرقم القومي 🪪" value={formData.nationalId}
                        onChange={handleChange}
                        disabled={submitting} required/>
                  {formErrors.nationalId && (
                      <p className="text-red-400 text-xs italic mt-1 ml-2 flex items-center">
                        <span className="text-red-500 mr-1">⚠️</span> {formErrors.nationalId}
                      </p>
                  )}
                  <p className="text-gray-300 text-xs mt-1 ml-2 flex items-center">
                    <span className="mr-1">🔒</span> Your National ID will only be visible to administrators.
                  </p>
                </div>
              </div>

              {/* Educational Information Section */}
              <div className="mb-1 md:mb-2 pt-1 md:pt-2">
                <h3 className="text-base md:text-lg font-medium text-white mb-2 flex items-center">
                  <span className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 flex items-center justify-center mr-2">🎓</span>
                  <span className="relative">
                    Educational Information
                    <span className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-blue-500 to-transparent"></span>
                  </span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* University */}
                  <div className="relative group">
                    <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500/50 to-blue-500/50 rounded-lg blur opacity-25 group-hover:opacity-80 transition duration-500"></div>
                    <div className="relative">
                      <input type="text" name="university" id="university"
                            className="block w-full p-3 text-sm rounded-xl text-white bg-[#3b4251] border-none focus:outline-none focus:ring-2 focus:ring-blue-500 group-hover:bg-[#414958] transition-all duration-300"
                            placeholder="University - الجامعة 🏫" value={formData.university}
                            onChange={handleChange}
                            disabled={submitting} required/>
                      {formErrors.university && (
                          <p className="text-red-400 text-xs italic mt-1 ml-2 flex items-center">
                            <span className="text-red-500 mr-1">⚠️</span> {formErrors.university}
                          </p>
                      )}
                    </div>
                  </div>
                  
                  {/* College */}
                  <div className="relative group">
                    <div className="absolute -inset-1 bg-gradient-to-r from-green-500/50 to-teal-500/50 rounded-lg blur opacity-25 group-hover:opacity-80 transition duration-500"></div>
                    <div className="relative">
                      <input type="text" name="college" id="college"
                            className="block w-full p-3 text-sm rounded-xl text-white bg-[#3b4251] border-none focus:outline-none focus:ring-2 focus:ring-teal-500 group-hover:bg-[#414958] transition-all duration-300"
                            placeholder="College - الكلية 🏛️" value={formData.college}
                            onChange={handleChange}
                            disabled={submitting} required/>
                      {formErrors.college && (
                          <p className="text-red-400 text-xs italic mt-1 ml-2 flex items-center">
                            <span className="text-red-500 mr-1">⚠️</span> {formErrors.college}
                          </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Gender and Status Section - Changed to be in one row on mobile */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-3">
                {/* Gender */}
                <div className="relative">
                  <label className="text-sm font-medium text-white mb-2 flex items-center">
                    <span className="w-6 h-6 rounded-full bg-gradient-to-r from-pink-400 to-purple-400 flex items-center justify-center mr-2">👫</span>
                    Gender - الجنس
                  </label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <div className="relative">
                      <input 
                        type="radio"
                        id="gender-male"
                        name="gender"
                        value="male"
                        checked={formData.gender === "male"}
                        onChange={handleChange}
                        disabled={submitting}
                        className="absolute opacity-0 w-full h-full cursor-pointer z-10"
                      />
                      <div className={`h-full flex items-center justify-center p-3 rounded-xl transition-all duration-300 ${formData.gender === "male" ? 'bg-gradient-to-r from-blue-600 to-blue-400 scale-105 shadow-lg' : 'bg-[#3b4251] hover:bg-[#414958]'}`}>
                        <div className="text-center">
                          <span className="text-2xl block mb-1">👨</span>
                          <span className={`text-sm font-medium ${formData.gender === "male" ? 'text-white' : 'text-gray-300'}`}>Male - ذكر</span>
                        </div>
                      </div>
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
                        className="absolute opacity-0 w-full h-full cursor-pointer z-10"
                      />
                      <div className={`h-full flex items-center justify-center p-3 rounded-xl transition-all duration-300 ${formData.gender === "female" ? 'bg-gradient-to-r from-pink-600 to-pink-400 scale-105 shadow-lg' : 'bg-[#3b4251] hover:bg-[#414958]'}`}>
                        <div className="text-center">
                          <span className="text-2xl block mb-1">👩</span>
                          <span className={`text-sm font-medium ${formData.gender === "female" ? 'text-white' : 'text-gray-300'}`}>Female - أنثى</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Status */}
                <div className="relative">
                  <label className="text-sm font-medium text-white mb-2 flex items-center">
                    <span className="w-6 h-6 rounded-full bg-gradient-to-r from-purple-400 to-indigo-400 flex items-center justify-center mr-2">🧑‍🎓</span>
                    Status - الحالة
                  </label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <div className="relative">
                      <input 
                        type="radio"
                        id="status-student"
                        name="status"
                        value="student"
                        checked={formData.status === "student"}
                        onChange={handleChange}
                        disabled={submitting}
                        className="absolute opacity-0 w-full h-full cursor-pointer z-10"
                      />
                      <div className={`h-full flex items-center justify-center p-3 rounded-xl transition-all duration-300 ${formData.status === "student" ? 'bg-gradient-to-r from-purple-600 to-indigo-600 scale-105 shadow-lg' : 'bg-[#3b4251] hover:bg-[#414958]'}`}>
                        <div className="text-center">
                          <span className="text-2xl block mb-1">📚</span>
                          <span className={`text-sm font-medium ${formData.status === "student" ? 'text-white' : 'text-gray-300'}`}>Student - طالب</span>
                        </div>
                      </div>
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
                        className="absolute opacity-0 w-full h-full cursor-pointer z-10"
                      />
                      <div className={`h-full flex items-center justify-center p-3 rounded-xl transition-all duration-300 ${formData.status === "graduate" ? 'bg-gradient-to-r from-green-600 to-teal-600 scale-105 shadow-lg' : 'bg-[#3b4251] hover:bg-[#414958]'}`}>
                        <div className="text-center">
                          <span className="text-2xl block mb-1">🎓</span>
                          <span className={`text-sm font-medium ${formData.status === "graduate" ? 'text-white' : 'text-gray-300'}`}>Graduate - خريج</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-center mt-6">
                <button
                  type="submit"
                  className="relative overflow-hidden group inline-flex items-center rounded-full bg-gradient-to-r from-purple-600 to-blue-600 px-8 py-3 text-lg font-bold text-white transition-all duration-300 ease-in-out hover:shadow-[0_0_15px_rgba(124,58,237,0.5)] hover:scale-105"
                  disabled={submitting}
                >
                  <span className="absolute h-0 w-0 rounded-full bg-white opacity-10 transition-all duration-300 ease-out group-hover:h-56 group-hover:w-56"></span>
                  <span className="relative flex items-center">
                    {submitting ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Processing...
                      </>
                    ) : (
                      <>
                        <span className="mr-2">✨</span> Register Now! <span className="ml-2">✨</span>
                      </>
                    )}
                  </span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
} 