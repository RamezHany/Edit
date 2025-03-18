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
    <div className="min-h-screen bg-gradient-to-l from-[#1f2937f2] to-[#111827f2]">
      {event?.image && (
        <div className="w-full h-48 md:h-72 relative overflow-hidden">
          <Image
            src={event.image}
            alt={`${companyName} - ${eventId} Event`}
            fill
            className="object-cover w-full"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#1f2937] to-transparent opacity-70"></div>
          <div className="absolute bottom-0 left-0 w-full p-4 text-white">
            <h1 className="text-2xl md:text-4xl font-bold">{event?.name}</h1>
            <h2 className="text-lg md:text-2xl">Hosted by {companyName}</h2>
          </div>
        </div>
      )}
      
      <div className="w-[95%] md:w-[80%] lg:w-[60%] mx-auto bg-[#353c49] rounded-lg shadow-xl overflow-hidden my-4 md:my-6">
        <div className="p-4 md:p-8">
          {!event?.image && (
            <>
              <h1 className="text-xl md:text-3xl font-bold mb-1 md:mb-2 text-white">
                Register for {event?.name}
              </h1>
              <h2 className="text-lg md:text-2xl text-gray-200 mb-4 md:mb-6">
                Hosted by {companyName}
              </h2>
            </>
          )}
          
          {success ? (
            <div className="text-center text-white">
              <div className="bg-green-700 border border-green-600 px-4 py-3 rounded mb-4 md:mb-6">
                <p className="font-bold">Registration Successful!</p>
                <p>Thank you for registering for this event.</p>
              </div>
              
              <div className="mb-4">
                <h3 className="text-lg font-semibold mb-2">Event Details:</h3>
                <p className="text-white mb-2">
                  <span className="font-semibold">Date:</span> {event?.date ? new Date(event.date).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  }) : 'Date not specified'}
                </p>
                <p className="text-white whitespace-pre-line">
                  <span className="font-semibold">Description:</span> {event?.description || 'No description available.'}
                </p>
              </div>
              
              <div className="flex justify-center">
                <Link
                  href={`/${companyName}/${eventId}`}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg transition-colors duration-300"
                >
                  Return to Event
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-2 md:space-y-3">
              {error && (
                <div className="bg-red-700 border border-red-600 text-white px-3 py-2 rounded mb-3">
                  {error}
                </div>
              )}

              {/* Personal Information Section */}
              <div className="mb-0 md:mb-1">
                <h3 className="text-base md:text-lg font-medium text-white mb-1 md:mb-2">Personal Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {/* Name */}
                  <div className="relative z-0 w-full mb-1 group">
                    <input type="text" name="name" id="name"
                          className="block w-full p-2 pl-2 text-sm rounded-lg text-white bg-[#494f5b] border border-gray-600 focus:border-blue-400 focus:outline-none"
                          placeholder="Name - الاسم" value={formData.name}
                          onChange={handleChange}
                          disabled={submitting} required/>
                    {formErrors.name && (
                        <p className="text-red-500 text-xs italic mt-0.5">{formErrors.name}</p>
                    )}
                  </div>

                  {/* Phone */}
                  <div className="relative z-0 w-full mb-1 group">
                    <input type="text" name="phone" id="phone"
                          className="block w-full p-2 pl-2 text-sm rounded-lg text-white bg-[#494f5b] border border-gray-600 focus:border-blue-400 focus:outline-none"
                          placeholder="Phone - رقم الهاتف" value={formData.phone}
                          onChange={handleChange}
                          disabled={submitting} required/>
                    {formErrors.phone && (
                        <p className="text-red-500 text-xs italic mt-0.5">{formErrors.phone}</p>
                    )}
                  </div>
                  
                  {/* Email */}
                  <div className="relative z-0 w-full mb-1 group">
                    <input type="email" name="email" id="email"
                          className="block w-full p-2 pl-2 text-sm rounded-lg text-white bg-[#494f5b] border border-gray-600 focus:border-blue-400 focus:outline-none"
                          placeholder="Email - البريد الإلكتروني" value={formData.email}
                          onChange={handleChange}
                          disabled={submitting} required/>
                    {formErrors.email && (
                        <p className="text-red-500 text-xs italic mt-0.5">{formErrors.email}</p>
                    )}
                  </div>
                  
                  {/* Age */}
                  <div className="relative z-0 w-full mb-1 group">
                    <input type="text" name="age" id="age"
                          className="block w-full p-2 pl-2 text-sm rounded-lg text-white bg-[#494f5b] border border-gray-600 focus:border-blue-400 focus:outline-none"
                          placeholder="Age - العمر" value={formData.age}
                          onChange={handleChange}
                          disabled={submitting} required/>
                    {formErrors.age && (
                        <p className="text-red-500 text-xs italic mt-0.5">{formErrors.age}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* National ID */}
              <div className="relative z-0 w-full mb-1 group">
                <input type="text" name="nationalId" id="nationalId"
                      className="block w-full p-2 pl-2 text-sm rounded-lg text-white bg-[#494f5b] border border-gray-600 focus:border-blue-400 focus:outline-none"
                      placeholder="National ID - الرقم القومي" value={formData.nationalId}
                      onChange={handleChange}
                      disabled={submitting} required/>
                {formErrors.nationalId && (
                    <p className="text-red-500 text-xs italic mt-0.5">{formErrors.nationalId}</p>
                )}
                <p className="text-gray-300 text-xs mt-0.5">Your National ID will only be visible to administrators.</p>
              </div>

              {/* Educational Information Section */}
              <div className="mb-0 md:mb-1 pt-1 md:pt-2">
                <h3 className="text-base md:text-lg font-medium text-white mb-1 md:mb-2">Educational Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {/* University */}
                  <div className="relative z-0 w-full mb-1 group">
                    <input type="text" name="university" id="university"
                          className="block w-full p-2 pl-2 text-sm rounded-lg text-white bg-[#494f5b] border border-gray-600 focus:border-blue-400 focus:outline-none"
                          placeholder="University - الجامعة" value={formData.university}
                          onChange={handleChange}
                          disabled={submitting} required/>
                    {formErrors.university && (
                        <p className="text-red-500 text-xs italic mt-0.5">{formErrors.university}</p>
                    )}
                  </div>
                  
                  {/* College */}
                  <div className="relative z-0 w-full mb-1 group">
                    <input type="text" name="college" id="college"
                          className="block w-full p-2 pl-2 text-sm rounded-lg text-white bg-[#494f5b] border border-gray-600 focus:border-blue-400 focus:outline-none"
                          placeholder="College - الكلية" value={formData.college}
                          onChange={handleChange}
                          disabled={submitting} required/>
                    {formErrors.college && (
                        <p className="text-red-500 text-xs italic mt-0.5">{formErrors.college}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Gender and Status Section - Changed to be in one row on mobile */}
              <div className="grid grid-cols-2 gap-2 mt-2">
                {/* Gender */}
                <div className="mb-1">
                  <label className="block text-sm font-medium text-white mb-1">
                    Gender - الجنس
                  </label>
                  <div className="flex flex-col sm:flex-row sm:space-x-4">
                    <div className="flex items-center mb-1 sm:mb-0">
                      <input
                        type="radio"
                        id="gender-male"
                        name="gender"
                        value="male"
                        checked={formData.gender === "male"}
                        onChange={handleChange}
                        disabled={submitting}
                        className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 focus:ring-blue-600"
                      />
                      <label htmlFor="gender-male" className="ml-2 text-sm font-medium text-white">
                        Male - ذكر
                      </label>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="radio"
                        id="gender-female"
                        name="gender"
                        value="female"
                        checked={formData.gender === "female"}
                        onChange={handleChange}
                        disabled={submitting}
                        className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 focus:ring-blue-600"
                      />
                      <label htmlFor="gender-female" className="ml-2 text-sm font-medium text-white">
                        Female - أنثى
                      </label>
                    </div>
                  </div>
                </div>

                {/* Status */}
                <div className="mb-1">
                  <label className="block text-sm font-medium text-white mb-1">
                    Status - الحالة
                  </label>
                  <div className="flex flex-col sm:flex-row sm:space-x-4">
                    <div className="flex items-center mb-1 sm:mb-0">
                      <input
                        type="radio"
                        id="status-student"
                        name="status"
                        value="student"
                        checked={formData.status === "student"}
                        onChange={handleChange}
                        disabled={submitting}
                        className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 focus:ring-blue-600"
                      />
                      <label htmlFor="status-student" className="ml-2 text-sm font-medium text-white">
                        Student - طالب
                      </label>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="radio"
                        id="status-graduate"
                        name="status"
                        value="graduate"
                        checked={formData.status === "graduate"}
                        onChange={handleChange}
                        disabled={submitting}
                        className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 focus:ring-blue-600"
                      />
                      <label htmlFor="status-graduate" className="ml-2 text-sm font-medium text-white">
                        Graduate - خريج
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-center mt-4">
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg transition-colors duration-300 w-full"
                  disabled={submitting}
                >
                  {submitting ? 'Submitting...' : 'Register for Event'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
} 