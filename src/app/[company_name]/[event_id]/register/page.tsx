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
}

interface FormErrors {
  name?: string;
  phone?: string;
  email?: string;
  college?: string;
  nationalId?: string;
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
          setError('Event not found or no longer available');
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
      console.log('Submitting registration with:', {
        companyName,
        eventName: event.id, // Use the exact event name from the API
      });
      
      const response = await fetch('/api/events/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          companyName,
          eventName: event.id, // Use the exact event name from the API
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
    <div className="min-h-screen  py-12 bg-gradient-to-l from-[#1f2937f2] to-[#111827f2]">
      <div className="w-[80%] md:w-[80%] lg:w-[50%] mx-auto bg-white rounded shadow-md overflow-hidden">
        {event?.image && (
          <div className="w-full h-64 relative overflow-hidden group">
            <Image
              src={event.image}
              alt={`${companyName} - ${eventId} Event`}
              fill
              className="object-cover transition-transform duration-500 ease-in-out group-hover:scale-105 group-hover:-rotate-1"
            />
          </div>
        )}
        {/**/}
        <div className="p-8 bg-[#353c49] ">
          <h1 className="text-[24px] md:text-[30px] font-bold  mb-2 text-black">
            Register for {event?.name}
          </h1>
          <h2 className="text-[24px] md:text-[30px] text-gray-100  mb-8">
            Hosted by {companyName}
          </h2>
          
          {success ? (
            <div className="text-center">
              <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-6">
                <p className="font-bold">Registration Successful!</p>
                <p>Thank you for registering for this event.</p>
              </div>
              
              {event?.image && (
                <div className="w-full h-48 relative mb-6 overflow-hidden group">
                  <Image
                    src={event.image}
                    alt={`${companyName} - ${eventId} Event`}
                    fill
                    className="object-contain transition-transform duration-500 ease-in-out group-hover:scale-105 group-hover:-rotate-1"
                  />
                </div>
              )}
              
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-2">Event Details:</h3>
                <p className="text-white mb-2">
                  <span className="font-semibold text-[20px]">Date :</span> {event?.date ? new Date(event.date).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  }) : 'Date not specified'}
                </p>
                <p className="text-white whitespace-pre-line">
                  <span className="font-semibold text-[20px]">Description :</span> {event?.description || 'No description available.'}
                </p>
              </div>
              
              <div className="flex flex-col space-y-4 sm:flex-row sm:space-y-0 sm:space-x-4 justify-center">
                {/*<button*/}
                {/*  onClick={() => setSuccess(false)}*/}
                {/*  className="bg-gray-500 hover:bg-gray-400 hover:text-black text-white font-bold py-3 px-6 rounded-lg text-lg transition-colors duration-300 cursor-pointer"*/}
                {/*>*/}
                {/*  Register Another Person*/}
                {/*</button>*/}
                <Link
                  href={`/${companyName}/${eventId}`}
                  className="bg-gray-500 hover:bg-gray-400 hover:text-black text-white font-bold py-3 px-6 rounded-lg text-lg transition-colors duration-300 cursor-pointer"
                >
                  Return to Event
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
                  {error}
                </div>
              )}

              <div className="relative z-0 w-full mb-5 group">
                  <input type="text" name="name" id="name"
                         className="block py-2.5 px-0 w-full pl-2 text-sm rounded-xl text-white  bg-[#494f5b]  focus:border-gray-400  bg-transparent  border-2 border-gray-300 appearance-none dark:text-white dark:border-gray-600  focus:outline-none focus:ring-0  peer"
                         placeholder=" " value={formData.name}
                         onChange={handleChange}
                         disabled={submitting}  required/>

                  <label htmlFor="name"
                         className="ps-2  peer-focus:font-bold peer-focus:text-[20px]  text-white absolute text-[16px]  dark:text-gray-400 duration-300 transform -translate-y-8 scale-75 top-3 z-10 origin-[0] peer-focus:start-0 rtl:peer-focus:translate-x-1/4 rtl:peer-focus:left-auto  peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-9">
                    Name - الاسم 👋 </label>
                  {formErrors.name && (
                      <p className="text-red-500 text-xs italic mt-1">{formErrors.name}</p>
                  )}

              </div>

              <div className="relative z-0 w-full  mb-5 group">
                <input type="text" name="phone" id="phone"
                       className="mt-10 block py-2.5 px-0 pl-2 w-full text-sm rounded-xl text-white  bg-[#494f5b]  focus:border-gray-400  bg-transparent  border-2 border-gray-300 appearance-none dark:text-white dark:border-gray-600  focus:outline-none focus:ring-0  peer"
                       placeholder=" " value={formData.phone}
                       onChange={handleChange}
                       disabled={submitting}
                       required
                />
                <label htmlFor="phone"
                       className="ps-2  peer-focus:font-bold peer-focus:text-[20px]  text-white absolute text-[16px]  dark:text-gray-400 duration-300 transform -translate-y-8 scale-75 top-3 z-10 origin-[0] peer-focus:start-0 rtl:peer-focus:translate-x-1/4 rtl:peer-focus:left-auto  peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-9">
                  Phone Number - رقم الهاتف  📱 </label>
                {formErrors.phone && (
                    <p className="text-red-500 text-xs italic mt-1">{formErrors.phone}</p>
                )}
              </div>

              <div className="relative z-0 w-full  mb-5 group">
                <input type="email" name="email" id="email"
                       className="mt-10 block py-2.5 px-0 w-full pl-2 text-sm rounded-xl text-white  bg-[#494f5b]  focus:border-gray-400  bg-transparent  border-2 border-gray-300 appearance-none dark:text-white dark:border-gray-600  focus:outline-none focus:ring-0  peer"
                       placeholder=" " value={formData.email}
                       onChange={handleChange}
                       disabled={submitting}
                       required
                />
                <label htmlFor="email"
                       className="ps-2  peer-focus:font-bold peer-focus:text-[20px]  text-white absolute text-[16px]  dark:text-gray-400 duration-300 transform -translate-y-8 scale-75 top-3 z-10 origin-[0] peer-focus:start-0 rtl:peer-focus:translate-x-1/4 rtl:peer-focus:left-auto  peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-9">
                  Your Email - البريد الأليكتروني  📧 </label>
                {formErrors.email && (
                  <p className="text-red-500 text-xs italic mt-1">{formErrors.email}</p>
                )}
              </div>

              <div className="mb-4">
                <div>
                  {/* Label for the gender radio group */}
                  <label htmlFor="gender" className="block mb-2 text-[16px] text-sm font-medium text-white dark:text-white">
                    Gender
                  </label>

                  {/* Gender Radio Button Group */}
                  <ul className="grid w-full gap-6 md:grid-cols-2">
                    {/* Male Option */}
                    <li>
                      <input
                          type="radio"
                          id="gender-male"
                          name="gender"
                          value="male"
                          checked={formData.gender === "male"}
                          onChange={handleChange}
                          disabled={submitting}
                          className="hidden peer"
                          required
                      />
                      <label
                          htmlFor="gender-male"
                          className="bg-[#494f5b] inline-flex items-center justify-center w-full p-5 text-white border border-gray-200 rounded-lg cursor-pointer dark:hover:text-gray-300 dark:border-gray-700 peer-checked:border-gray-400 dark:peer-checked:border-gray-700 peer-checked:bg-gray-300 peer-checked:text-black hover:text-gray-600 hover:bg-gray-300 dark:text-gray-400 dark:bg-gray-800 dark:hover:bg-gray-700"
                      >
                        <div className="block">
                          <div className="w-full text-lg font-semibold text-center">🙎🏻‍♂️</div>
                          <div className="w-full text-center">Male</div>
                        </div>
                      </label>
                    </li>

                    {/* Female Option */}
                    <li>
                      <input
                          type="radio"
                          id="gender-female"
                          name="gender"
                          value="female"
                          checked={formData.gender === "female"}
                          onChange={handleChange}
                          disabled={submitting}
                          className="hidden peer"
                          required
                      />
                      <label
                          htmlFor="gender-female"
                          className="bg-[#494f5b] inline-flex items-center justify-center w-full p-5 text-white border border-gray-200 rounded-lg cursor-pointer dark:hover:text-gray-300 dark:border-gray-700 peer-checked:border-gray-400 dark:peer-checked:border-gray-700 peer-checked:bg-gray-300 peer-checked:text-black hover:text-gray-600 hover:bg-gray-300 dark:text-gray-400 dark:bg-gray-800 dark:hover:bg-gray-700"
                      >
                        <div className="block">
                          <div className="w-full text-lg font-semibold text-center">🙍🏻‍♀️</div>
                          <div className="w-full text-center">Female</div>
                        </div>
                      </label>
                    </li>
                  </ul>
                </div>
              </div>

              <div className="relative z-0 w-full  mb-5 group">
                <input type="text" name="college" id="college"
                       className="mt-10 block py-2.5 px-0 w-full pl-2 text-sm rounded-xl text-white  bg-[#494f5b]  focus:border-gray-400  bg-transparent  border-2 border-gray-300 appearance-none dark:text-white dark:border-gray-600  focus:outline-none focus:ring-0  peer"
                       placeholder=""
                       value={formData.college}
                       onChange={handleChange}
                       disabled={submitting}
                       required
                />
                <label htmlFor="college"
                       className="ps-2  peer-focus:font-bold peer-focus:text-[20px]  text-white absolute text-[16px]  dark:text-gray-400 duration-300 transform -translate-y-8 scale-75 top-3 z-10 origin-[0] peer-focus:start-0 rtl:peer-focus:translate-x-1/4 rtl:peer-focus:left-auto  peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-9">
                  Collage - الجامعه  🎓
                </label>
                {formErrors.college && (
                  <p className="text-red-500 text-xs italic mt-1">{formErrors.college}</p>
                )}
              </div>

              <div className="mb-4">
                  <label htmlFor="status" className="block mb-2 text-[20px] text-sm font-medium text-white dark:text-white">
                    Status
                  </label>

                  <ul className="grid w-full gap-6 md:grid-cols-2">

                    <li>
                      <input
                          type="radio"
                          id="status-student"
                          name="status"
                          value="student"
                          checked={formData.status === "student"}
                          onChange={handleChange}
                          disabled={submitting}
                          className="hidden peer"
                          required
                      />
                      <label
                          htmlFor="status-student"
                          className="bg-[#494f5b] inline-flex items-center justify-center w-full p-5 text-white border border-gray-200 rounded-lg cursor-pointer dark:hover:text-gray-300 dark:border-gray-700  peer-checked:border-gray-400 dark:peer-checked:border-gray-700 peer-checked:bg-gray-300 peer-checked:text-black hover:text-gray-600 hover:bg-gray-300 dark:text-gray-400 dark:bg-gray-800 dark:hover:bg-gray-700"
                      >
                        <div className="block">
                          <div className="w-full text-lg font-semibold text-center">👨🏻‍💻</div>
                          <div className="w-full text-center">Student</div>
                        </div>
                      </label>
                    </li>

                    <li>
                      <input
                          type="radio"
                          id="status-graduate"
                          name="status"
                          value="graduate"
                          checked={formData.status === "graduate"}
                          onChange={handleChange}
                          disabled={submitting}
                          className="hidden peer"
                          required
                      />
                      <label
                          htmlFor="status-graduate"
                          className="bg-[#494f5b] inline-flex items-center justify-center w-full p-5 text-white border border-gray-200 rounded-lg cursor-pointer dark:hover:text-gray-300 dark:border-gray-700  peer-checked:border-gray-400 dark:peer-checked:border-gray-700 peer-checked:bg-gray-300 peer-checked:text-black hover:text-gray-600 hover:bg-gray-300 dark:text-gray-400 dark:bg-gray-800 dark:hover:bg-gray-700"
                      >
                        <div className="block">
                          <div className="w-full text-lg font-semibold text-center">🎓️</div>
                          <div className="w-full text-center">Graduate</div>
                        </div>
                      </label>
                    </li>
                  </ul>
              </div>

              <div className="relative z-0 w-full  mb-5 group">
                <input type="text" name="nationalId" id="nationalId"
                       className="mt-10 block py-2.5 px-0 w-full pl-2 text-sm rounded-xl text-white  bg-[#494f5b]  focus:border-gray-400  bg-transparent  border-2 border-gray-300 appearance-none dark:text-white dark:border-gray-600  focus:outline-none focus:ring-0  peer"
                       placeholder=" " value={formData.nationalId}
                       onChange={handleChange}
                       disabled={submitting}
                       required
                />
                <label htmlFor="nationalId"
                       className="ps-2  peer-focus:font-bold peer-focus:text-[20px]  text-white absolute text-[16px]  dark:text-gray-400 duration-300 transform -translate-y-8 scale-75 top-3 z-10 origin-[0] peer-focus:start-0 rtl:peer-focus:translate-x-1/4 rtl:peer-focus:left-auto  peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-9">
                  National ID - الرقم القومي 🪪
                </label>
                {formErrors.nationalId && (
                    <p className="text-red-500 text-xs italic mt-1">{formErrors.nationalId}</p>
                )}
                <p className="text-light text-[16px]     text-white  mt-3">
                  Your National ID will only be visible to administrators.
                </p>
              </div>

              <div className="flex items-center justify-center">
                <button
                  type="submit"
                  className="bg-gray-500 hover:bg-gray-400 hover:text-black  text-white font-bold py-3 px-6 rounded-lg text-lg transition-colors duration-300 cursor-pointer"
                  disabled={submitting}
                >
                  {submitting ? 'Submitting...' : '✨ Register for Event ✨'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
} 