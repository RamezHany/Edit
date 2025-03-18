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
    <div className={`min-h-screen relative overflow-hidden ${theme === 'dark' ? 'bg-gradient-to-br from-purple-900 via-[#1f2937] to-blue-900' : 'bg-gradient-to-br from-blue-100 via-white to-purple-100'}`}>
      {/* Add CSS for theme transitions */}
      <style jsx global>{`
        body {
          transition: background-color 0.3s ease, color 0.3s ease;
        }
        
        body.light-theme {
          color: #1f2937;
          background-color: #f9fafb;
        }
        
        body.dark-theme {
          color: #f9fafb;
          background-color: #1f2937;
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
      
      {/* Theme toggle button */}
      <button 
        onClick={toggleTheme} 
        className={`absolute top-4 right-4 z-50 p-2 rounded-full ${theme === 'dark' ? 'bg-yellow-300 text-gray-900' : 'bg-gray-800 text-yellow-300'} transition-all duration-300 hover:scale-110`}
        aria-label="Toggle theme"
      >
        {theme === 'dark' ? (
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
          </svg>
        )}
      </button>

      {/* Animated background elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-20 pointer-events-none">
        <div className={`absolute w-24 h-24 ${theme === 'dark' ? 'bg-blue-500' : 'bg-blue-400'} rounded-full top-1/4 left-1/4 animate-pulse`}></div>
        <div className={`absolute w-16 h-16 ${theme === 'dark' ? 'bg-purple-500' : 'bg-purple-400'} rounded-full top-3/4 left-1/3 animate-ping`}></div>
        <div className={`absolute w-32 h-32 ${theme === 'dark' ? 'bg-pink-500' : 'bg-pink-400'} rounded-full bottom-1/4 right-1/4 animate-pulse`}></div>
        <div className={`absolute w-20 h-20 ${theme === 'dark' ? 'bg-yellow-500' : 'bg-yellow-400'} rounded-full top-1/2 right-1/3 animate-bounce`}></div>
      </div>
      
        {event?.image && (
        <div className="w-full h-56 md:h-72 relative overflow-hidden">
          {/* الصورة الرئيسية بتاخد المساحة كاملة كبنر */}
          <div className="absolute inset-0 z-10">
            <Image
              src={event.image}
              alt={`${companyName} - ${eventId} Event`}
              fill
              className="object-cover w-full"
            />
            {/* طبقة تدرج لتحسين قراءة النص */}
            <div className="absolute inset-0 bg-gradient-to-t from-purple-900/90 via-purple-900/50 to-transparent"></div>
          </div>
          
          {/* تأثيرات خلفية متحركة تظهر فوق الصورة */}
          <div className="absolute inset-0 z-20 opacity-30 pointer-events-none overflow-hidden">
            <div className="absolute w-20 h-20 rounded-full bg-pink-500/30 -left-5 top-10 animate-pulse"></div>
            <div className="absolute w-32 h-32 rounded-full bg-blue-500/20 right-10 bottom-5 animate-pulse"></div>
            <div className="absolute w-16 h-16 rounded-full bg-purple-500/30 left-1/4 top-1/3 animate-ping"></div>
            <div className="absolute w-24 h-24 rounded-full bg-yellow-500/20 right-1/4 top-1/2 animate-pulse"></div>
          </div>
          
          {/* نجوم متلألئة */}
          <div className="absolute inset-0 z-20 opacity-60 pointer-events-none">
            {[...Array(6)].map((_, i) => (
              <div key={i} 
                   className="absolute w-1 h-1 bg-white rounded-full animate-ping"
                   style={{
                     top: `${20 + i * 15}%`,
                     left: `${10 + i * 12}%`,
                     animationDelay: `${i * 0.2}s`,
                     animationDuration: `${1 + i * 0.3}s`
                   }}
              ></div>
            ))}
          </div>
          
          {/* معلومات الحدث */}
          <div className="absolute bottom-0 left-0 w-full p-4 md:p-6 z-30">
            <div className="max-w-4xl mx-auto">
              <h1 className="text-2xl md:text-4xl font-bold mb-1 text-white drop-shadow-lg">{event?.name}</h1>
              <h2 className="text-base md:text-xl text-white/90 flex items-center">
                <span className="inline-block mr-2">✨</span>
                Hosted by {companyName}
                <span className="inline-block ml-2">✨</span>
              </h2>
            </div>
          </div>
          </div>
        )}
      
      {/* الفورم بتصميم محسن للموبايل */}
      <div className={`w-[98%] md:w-[90%] lg:w-[75%] mx-auto ${theme === 'dark' ? 'bg-[#353c49]/95 border-purple-500/30' : 'bg-white/95 border-purple-300/50'} backdrop-blur-sm rounded-t-none rounded-b-3xl shadow-2xl overflow-hidden -mt-2 md:-mt-4 border-t-0 border-x border-b relative z-30`}
           style={{ marginTop: event?.image ? "-1rem" : "1rem" }}>
        <div className="p-4 md:p-6 relative">
          {/* عناصر الزخرفة */}
          <div className={`absolute top-0 right-0 w-32 h-32 ${theme === 'dark' ? 'bg-gradient-to-br from-pink-500/10 to-purple-500/10' : 'bg-gradient-to-br from-pink-300/20 to-purple-300/20'} rounded-bl-full`}></div>
          <div className={`absolute bottom-0 left-0 w-24 h-24 ${theme === 'dark' ? 'bg-gradient-to-tr from-blue-500/10 to-cyan-500/10' : 'bg-gradient-to-tr from-blue-300/20 to-cyan-300/20'} rounded-tr-full`}></div>
          
          {/* عنوان الفورم (في حالة عدم وجود صورة) */}
          {!event?.image && (
            <>
              <h1 className={`text-xl md:text-3xl font-bold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-800'} relative inline-block`}>
                Register for {event?.name} ✨
                <span className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-pink-500 to-blue-500 rounded"></span>
          </h1>
              <h2 className={`text-lg md:text-2xl ${theme === 'dark' ? 'text-gray-200' : 'text-gray-600'} mb-4`}>
                Hosted by {companyName} 🎉
          </h2>
            </>
          )}
          
          {/* محتوى النجاح أو الفورم */}
          {success ? (
            <div className={`text-center ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
              <div className="bg-green-600/90 backdrop-blur-sm border border-green-400 px-4 py-6 rounded-2xl mb-4 md:mb-6 relative overflow-hidden group">
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
                <h3 className={`text-lg font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>Event Details:</h3>
                <p className={`mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-700'}`}>
                  <span className="font-semibold">📅 Date:</span> {event?.date ? new Date(event.date).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  }) : 'Date not specified'}
                </p>
                <p className={`whitespace-pre-line ${theme === 'dark' ? 'text-white' : 'text-gray-700'}`}>
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
              {/* شريط الإشعارات بلون جديد */}
              {error && (
                <div className="bg-gradient-to-r from-red-600/80 to-orange-600/80 backdrop-blur-sm border border-red-400 text-white px-4 py-3 rounded-xl mb-4 shadow-lg">
                  <div className="flex items-center">
                    <span className="text-2xl mr-2">⚠️</span>
                    <p>{error}</p>
                  </div>
                </div>
              )}

              {/* Personal Information Section */}
              <div className="mb-1 md:mb-2">
                <h3 className={`text-base md:text-lg font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-800'} mb-2 flex items-center`}>
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
                            className={`block w-full p-3 text-sm rounded-xl ${theme === 'dark' ? 'text-white bg-[#3b4251] group-hover:bg-[#414958]' : 'text-gray-800 bg-gray-100 group-hover:bg-gray-200'} border-none focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all duration-300`}
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
                            className={`block w-full p-3 text-sm rounded-xl ${theme === 'dark' ? 'text-white bg-[#3b4251] group-hover:bg-[#414958]' : 'text-gray-800 bg-gray-100 group-hover:bg-gray-200'} border-none focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300`}
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
                            className={`block w-full p-3 text-sm rounded-xl ${theme === 'dark' ? 'text-white bg-[#3b4251] group-hover:bg-[#414958]' : 'text-gray-800 bg-gray-100 group-hover:bg-gray-200'} border-none focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all duration-300`}
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
                            className={`block w-full p-3 text-sm rounded-xl ${theme === 'dark' ? 'text-white bg-[#3b4251] group-hover:bg-[#414958]' : 'text-gray-800 bg-gray-100 group-hover:bg-gray-200'} border-none focus:outline-none focus:ring-2 focus:ring-yellow-500 transition-all duration-300`}
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
                        className={`block w-full p-3 text-sm rounded-xl ${theme === 'dark' ? 'text-white bg-[#3b4251] group-hover:bg-[#414958]' : 'text-gray-800 bg-gray-100 group-hover:bg-gray-200'} border-none focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all duration-300`}
                        placeholder="National ID - الرقم القومي 🪪" value={formData.nationalId}
                       onChange={handleChange}
                        disabled={submitting} required/>
                  {formErrors.nationalId && (
                      <p className="text-red-400 text-xs italic mt-1 ml-2 flex items-center">
                        <span className="text-red-500 mr-1">⚠️</span> {formErrors.nationalId}
                      </p>
                  )}
                  <p className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-500'} text-xs mt-1 ml-2 flex items-center`}>
                    <span className="mr-1">🔒</span> Your National ID will only be visible to administrators.
                  </p>
                </div>
              </div>

              {/* Educational Information Section */}
              <div className="mb-1 md:mb-2 pt-2">
                <h3 className={`text-base md:text-lg font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-800'} mb-2 flex items-center`}>
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
                            className={`block w-full p-3 text-sm rounded-xl ${theme === 'dark' ? 'text-white bg-[#3b4251] group-hover:bg-[#414958]' : 'text-gray-800 bg-gray-100 group-hover:bg-gray-200'} border-none focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300`}
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
                            className={`block w-full p-3 text-sm rounded-xl ${theme === 'dark' ? 'text-white bg-[#3b4251] group-hover:bg-[#414958]' : 'text-gray-800 bg-gray-100 group-hover:bg-gray-200'} border-none focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all duration-300`}
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

              {/* Gender and Status Section - محسن للموبايل */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                {/* Gender */}
                <div className="relative">
                  <label className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-700'} mb-2 flex items-center`}>
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
                      <div className={`h-full flex items-center justify-center p-3 rounded-xl transition-all duration-300 ${formData.gender === "male" ? 'bg-gradient-to-r from-blue-600 to-blue-400 scale-105 shadow-lg' : `${theme === 'dark' ? 'bg-[#3b4251] hover:bg-[#414958]' : 'bg-gray-100 hover:bg-gray-200'}`}`}>
                        <div className="text-center">
                          <span className="text-2xl block mb-1">👨</span>
                          <span className={`text-sm font-medium ${formData.gender === "male" ? 'text-white' : theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>Male - ذكر</span>
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
                      <div className={`h-full flex items-center justify-center p-3 rounded-xl transition-all duration-300 ${formData.gender === "female" ? 'bg-gradient-to-r from-pink-600 to-pink-400 scale-105 shadow-lg' : `${theme === 'dark' ? 'bg-[#3b4251] hover:bg-[#414958]' : 'bg-gray-100 hover:bg-gray-200'}`}`}>
                        <div className="text-center">
                          <span className="text-2xl block mb-1">👩</span>
                          <span className={`text-sm font-medium ${formData.gender === "female" ? 'text-white' : theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>Female - أنثى</span>
                        </div>
                      </div>
                    </div>
                </div>
              </div>

                {/* Status */}
                <div className="relative">
                  <label className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-700'} mb-2 flex items-center`}>
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
                      <div className={`h-full flex items-center justify-center p-3 rounded-xl transition-all duration-300 ${formData.status === "student" ? 'bg-gradient-to-r from-purple-600 to-indigo-600 scale-105 shadow-lg' : `${theme === 'dark' ? 'bg-[#3b4251] hover:bg-[#414958]' : 'bg-gray-100 hover:bg-gray-200'}`}`}>
                        <div className="text-center">
                          <span className="text-2xl block mb-1">📚</span>
                          <span className={`text-sm font-medium ${formData.status === "student" ? 'text-white' : theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>Student - طالب</span>
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
                      <div className={`h-full flex items-center justify-center p-3 rounded-xl transition-all duration-300 ${formData.status === "graduate" ? 'bg-gradient-to-r from-green-600 to-teal-600 scale-105 shadow-lg' : `${theme === 'dark' ? 'bg-[#3b4251] hover:bg-[#414958]' : 'bg-gray-100 hover:bg-gray-200'}`}`}>
                        <div className="text-center">
                          <span className="text-2xl block mb-1">🎓</span>
                          <span className={`text-sm font-medium ${formData.status === "graduate" ? 'text-white' : theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>Graduate - خريج</span>
                        </div>
                      </div>
                    </div>
                  </div>
              </div>
              </div>

              {/* زر التسجيل محسن للموبايل */}
              <div className="flex items-center justify-center mt-6 md:mt-8">
                <button
                  type="submit"
                  className="relative overflow-hidden group inline-flex items-center rounded-full bg-gradient-to-r from-purple-600 to-blue-600 px-8 py-3 w-full md:w-auto text-center md:text-lg font-bold text-white transition-all duration-300 ease-in-out hover:shadow-[0_0_15px_rgba(124,58,237,0.5)] hover:scale-105"
                  disabled={submitting}
                >
                  <span className="absolute h-0 w-0 rounded-full bg-white opacity-10 transition-all duration-300 ease-out group-hover:h-56 group-hover:w-56"></span>
                  <span className="relative flex items-center justify-center w-full">
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

        {/* Alestra footer */}
        <div className={`relative mt-6 mb-4 px-4 text-center ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
          <div className="relative flex flex-col items-center justify-center space-y-3">
            {/* Divider with animated glow */}
            <div className="flex items-center justify-center space-x-3 relative">
              <div className={`h-px w-20 ${theme === 'dark' ? 'bg-gradient-to-r from-transparent via-purple-500 to-transparent' : 'bg-gradient-to-r from-transparent via-indigo-400 to-transparent'}`}></div>
              
              {/* Logo with glow effect */}
              <div className="relative group">
                <div className={`absolute -inset-1 rounded-full blur-md opacity-75 group-hover:opacity-100 transition duration-500 ${theme === 'dark' ? 'bg-purple-600/30' : 'bg-indigo-400/30'}`}></div>
                <div className={`relative flex items-center justify-center w-12 h-12 rounded-full shadow-lg ${theme === 'dark' ? 'bg-gradient-to-br from-indigo-900 via-purple-900 to-purple-800' : 'bg-gradient-to-br from-indigo-200 via-purple-200 to-purple-100'} overflow-hidden`}>
                  {/* Animated background */}
                  <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-purple-600 opacity-90"></div>
                  
                  {/* Animated shine effect */}
                  <div className="absolute inset-0 opacity-30">
                    <div className="absolute top-0 -left-[100%] h-full w-[250%] animate-shine bg-gradient-to-r from-transparent via-white to-transparent" 
                         style={{ animationDuration: '3s' }}></div>
                  </div>
                  
                  {/* Logo Text */}
                  <span className="relative text-lg font-bold text-white flex items-center">
                    <span className="relative z-10">A</span>
                    <span className="absolute top-0 left-0 text-lg font-bold text-white blur-[1px] opacity-70 z-0">A</span>
                  </span>
                </div>
              </div>
              
              <div className={`h-px w-20 ${theme === 'dark' ? 'bg-gradient-to-r from-transparent via-purple-500 to-transparent' : 'bg-gradient-to-r from-transparent via-indigo-400 to-transparent'}`}></div>
            </div>
            
            {/* Text with animated gradient */}
            <div className="flex items-center space-x-1 group">
              <span>Powered by</span>
              <span className="relative font-bold">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-indigo-500 group-hover:from-indigo-500 group-hover:to-purple-600 transition-all duration-500">Alestra</span>
                {/* Subtle underline animation */}
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-purple-600 to-indigo-500 group-hover:w-full transition-all duration-500"></span>
              </span>
              <span className="text-xs">™</span>
            </div>
            
            {/* Tagline with subtle animation */}
            <div className="overflow-hidden">
              <p className="text-xs opacity-75 max-w-xs mx-auto transform hover:scale-105 transition-transform duration-300">
                Beautiful event registration platforms for creating memorable experiences
              </p>
            </div>
            
            {/* Sparkles for decoration */}
            <div className="absolute -top-3 -left-2 w-full h-full pointer-events-none opacity-50">
              <div className={`absolute top-1/2 left-1/4 w-1 h-1 rounded-full ${theme === 'dark' ? 'bg-purple-400' : 'bg-indigo-400'} animate-ping`} style={{ animationDuration: '3s' }}></div>
              <div className={`absolute top-1/4 right-1/3 w-1 h-1 rounded-full ${theme === 'dark' ? 'bg-indigo-400' : 'bg-purple-400'} animate-ping`} style={{ animationDuration: '2.5s' }}></div>
              <div className={`absolute bottom-1/2 right-1/4 w-1 h-1 rounded-full ${theme === 'dark' ? 'bg-pink-400' : 'bg-pink-300'} animate-ping`} style={{ animationDuration: '4s' }}></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 