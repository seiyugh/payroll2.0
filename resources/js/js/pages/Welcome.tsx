"use client"

import { useState, useEffect, useRef } from "react"
import { Link } from "@inertiajs/react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  ArrowRight,
  Moon,
  Sun,
  Phone,
  Wifi,
  Globe,
  Clock,
  MapPin,
  Smartphone,
  Radio,
  Signal,
  Headphones,
  ShieldCheck,
} from "lucide-react"

const LandingPage = () => {
  // State to manage dark mode toggle
  const [darkMode, setDarkMode] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [activeTestimonial, setActiveTestimonial] = useState(0)
  const featuresRef = useRef(null)
  const servicesRef = useRef(null)
  const contactRef = useRef(null)

  // Check localStorage for dark mode preference on mount
  useEffect(() => {
    const storedMode = localStorage.getItem("darkMode")
    if (storedMode === "true") {
      setDarkMode(true)
    }
  }, [])

  // Update dark mode in localStorage and body class
  useEffect(() => {
    if (darkMode) {
      document.body.classList.add("dark")
      localStorage.setItem("darkMode", "true")
    } else {
      document.body.classList.remove("dark")
      localStorage.setItem("darkMode", "false")
    }
  }, [darkMode])

  // Animate features when in view
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          const features = document.querySelectorAll(".feature-card")
          features.forEach((feature, index) => {
            setTimeout(() => {
              feature.classList.add("animate-in")
            }, index * 200)
          })
        }
      },
      { threshold: 0.1 },
    )

    if (featuresRef.current) {
      observer.observe(featuresRef.current)
    }

    return () => {
      if (featuresRef.current) {
        observer.unobserve(featuresRef.current)
      }
    }
  }, [])

  // Auto-rotate testimonials
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveTestimonial((prev) => (prev + 1) % testimonials.length)
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  const services = [
    {
      title: "Mobile Network Services",
      description:
        "Connect with our reliable mobile network services offering clear calls and fast data across the Philippines.",
      icon: Smartphone,
    },
    {
      title: "Internet Solutions",
      description: "High-speed internet solutions for homes and businesses with flexible plans to suit your needs.",
      icon: Wifi,
    },
    {
      title: "Telecom Equipment",
      description: "Quality telecommunications equipment and accessories for all your connectivity needs.",
      icon: Radio,
    },
    {
      title: "Network Installation",
      description: "Professional installation services for network infrastructure in homes and commercial spaces.",
      icon: Signal,
    },
    {
      title: "Technical Support",
      description: "Dedicated technical support to resolve connectivity issues and maintain your telecom systems.",
      icon: Headphones,
    },
    {
      title: "Secure Connections",
      description: "Secure and reliable connections with advanced protection for your telecommunications needs.",
      icon: ShieldCheck,
    },
  ]

  const testimonials = [
    {
      name: "Maria Santos",
      role: "Small Business Owner, Batangas City",
      content:
        "JBD Telecom Hub Point has been essential for my business communications. Their reliable service and quick technical support have kept my operations running smoothly.",
      avatar: "/placeholder.svg?height=60&width=60",
    },
    {
      name: "Juan Reyes",
      role: "Resident, San Pascual",
      content:
        "As a local resident, I've been using JBD's internet services for years. Their consistent connection quality and friendly customer service make them the best choice in our area.",
      avatar: "/placeholder.svg?height=60&width=60",
    },
    {
      name: "Elena Mendoza",
      role: "School Administrator, Batangas",
      content:
        "Our school's communication systems are powered by JBD Telecom. Their team helped us set up a reliable network that supports our educational activities and administrative needs.",
      avatar: "/placeholder.svg?height=60&width=60",
    },
  ]

  return (
    <div
      className={`min-h-screen ${darkMode ? "dark bg-slate-950 text-white" : "bg-white text-slate-900"} transition-colors duration-300`}
    >
      {/* Navigation */}
      <nav className="fixed w-full z-50 backdrop-blur-md bg-white/90 dark:bg-slate-950/90 border-b border-slate-200 dark:border-slate-800 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-teal-500 bg-clip-text text-transparent">
                JBD Telecom Hub Point
              </span>
            </div>
            <div className="hidden md:flex items-center space-x-8">
              <a
                href="#services"
                className="text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              >
                Services
              </a>
              <a
                href="#testimonials"
                className="text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              >
                Testimonials
              </a>
              <a
                href="#contact"
                className="text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              >
                Contact
              </a>
              <Link href="/login">
                <Button
                  variant="outline"
                  className="ml-4 border-blue-600 text-blue-600 hover:bg-blue-50 dark:border-blue-400 dark:text-blue-400 dark:hover:bg-blue-950"
                >
                  Staff Login
                </Button>
              </Link>
              <button
                onClick={() => setDarkMode(!darkMode)}
                className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                aria-label="Toggle dark mode"
              >
                {darkMode ? <Sun className="h-5 w-5 text-amber-400" /> : <Moon className="h-5 w-5 text-slate-700" />}
              </button>
            </div>
            <div className="md:hidden flex items-center">
              <button
                onClick={() => setDarkMode(!darkMode)}
                className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors mr-2"
                aria-label="Toggle dark mode"
              >
                {darkMode ? <Sun className="h-5 w-5 text-amber-400" /> : <Moon className="h-5 w-5 text-slate-700" />}
              </button>
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="p-2 rounded-md hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                aria-label="Toggle menu"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>
        {/* Mobile menu */}
        {isMenuOpen && (
          <div className="md:hidden bg-white dark:bg-slate-900 shadow-lg transition-all duration-300">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
              <a
                href="#services"
                className="block px-3 py-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Services
              </a>
              <a
                href="#testimonials"
                className="block px-3 py-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Testimonials
              </a>
              <a
                href="#contact"
                className="block px-3 py-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Contact
              </a>
              <Link
                href="/login"
                className="block px-3 py-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Staff Login
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        <div className="absolute inset-0 z-0 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-transparent to-teal-50 dark:from-blue-950/30 dark:to-teal-950/30"></div>
          <div className="absolute top-0 left-0 right-0 h-[500px] bg-gradient-to-b from-blue-50/50 to-transparent dark:from-blue-950/20"></div>
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-300/20 dark:bg-blue-600/10 rounded-full filter blur-3xl opacity-70 animate-blob"></div>
          <div className="absolute top-60 -left-40 w-80 h-80 bg-teal-300/20 dark:bg-teal-600/10 rounded-full filter blur-3xl opacity-70 animate-blob animation-delay-2000"></div>
        </div>

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight mb-6 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-teal-500 dark:from-blue-400 dark:to-teal-400 animate-gradient">
              JBD Telecom Hub Point
            </h1>
            <p className="max-w-2xl mx-auto text-xl text-slate-700 dark:text-slate-300 mb-10 animate-fade-in">
              Providing quality telecommunications services in San Pascual, Batangas and beyond.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4 animate-fade-in-up">
              <a href="#contact">
                <Button size="lg" className="group bg-blue-600 hover:bg-blue-700 text-white">
                  Contact Us
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Button>
              </a>
              <a href="#services">
                <Button
                  size="lg"
                  variant="outline"
                  className="border-blue-600 text-blue-600 hover:bg-blue-50 dark:border-blue-400 dark:text-blue-400 dark:hover:bg-blue-950/50"
                >
                  Our Services
                </Button>
              </a>
            </div>
          </div>

          <div className="mt-16 relative">
            <div className="absolute inset-0 bg-gradient-to-t from-white dark:from-slate-950 to-transparent z-10 h-40 bottom-0"></div>
            <div className="relative mx-auto rounded-xl overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 animate-float">
              <img src="/placeholder.svg?height=600&width=1200" alt="Telecom Services" className="w-full" />
            </div>
          </div>
        </div>
      </section>

      {/* Business Info Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white dark:bg-slate-950 transition-colors duration-300">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="flex items-start p-6 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
              <MapPin className="h-8 w-8 text-blue-600 dark:text-blue-400 mr-4 flex-shrink-0" />
              <div>
                <h3 className="text-xl font-semibold mb-2 text-slate-900 dark:text-white">Location</h3>
                <p className="text-slate-700 dark:text-slate-300">
                  Barangay Poblacion, San Pascual, Batangas, 4204 Philippines
                </p>
              </div>
            </div>

            <div className="flex items-start p-6 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
              <Clock className="h-8 w-8 text-blue-600 dark:text-blue-400 mr-4 flex-shrink-0" />
              <div>
                <h3 className="text-xl font-semibold mb-2 text-slate-900 dark:text-white">Business Hours</h3>
                <p className="text-slate-700 dark:text-slate-300">
                  Monday to Saturday: 8:00 AM – 5:00 PM
                  <br />
                  Sunday: Closed
                </p>
              </div>
            </div>

            <div className="flex items-start p-6 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
              <Phone className="h-8 w-8 text-blue-600 dark:text-blue-400 mr-4 flex-shrink-0" />
              <div>
                <h3 className="text-xl font-semibold mb-2 text-slate-900 dark:text-white">Contact</h3>
                <p className="text-slate-700 dark:text-slate-300">
                  Phone: +63 (XXX) XXX-XXXX
                  <br />
                  Email: info@jbdtelecom.com
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section
        id="services"
        ref={featuresRef}
        className="py-20 px-4 sm:px-6 lg:px-8 bg-slate-50 dark:bg-slate-900 transition-colors duration-300"
      >
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-teal-500 dark:from-blue-400 dark:to-teal-400 bg-clip-text text-transparent">
              Our Services
            </h2>
            <p className="text-xl text-slate-700 dark:text-slate-300 max-w-3xl mx-auto">
              Comprehensive telecommunications solutions for homes and businesses
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {services.map((service, index) => (
              <Card
                key={index}
                className="feature-card p-6 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:shadow-xl transition-all duration-300 opacity-0 translate-y-8 group"
              >
                <div className="h-12 w-12 rounded-lg bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center mb-4 group-hover:bg-blue-600 group-hover:text-white transition-colors duration-300">
                  <service.icon className="h-6 w-6 text-blue-600 dark:text-blue-400 group-hover:text-white transition-colors duration-300" />
                </div>
                <h3 className="text-xl font-semibold mb-2 text-slate-900 dark:text-white">{service.title}</h3>
                <p className="text-slate-600 dark:text-slate-400">{service.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section
        id="testimonials"
        className="py-20 px-4 sm:px-6 lg:px-8 bg-white dark:bg-slate-950 transition-colors duration-300"
      >
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-teal-500 dark:from-blue-400 dark:to-teal-400 bg-clip-text text-transparent">
              What Our Customers Say
            </h2>
            <p className="text-xl text-slate-700 dark:text-slate-300 max-w-3xl mx-auto">
              Trusted by businesses and residents throughout Batangas
            </p>
          </div>

          <div className="relative">
            <div className="overflow-hidden">
              <div
                className="flex transition-transform duration-500 ease-in-out"
                style={{ transform: `translateX(-${activeTestimonial * 100}%)` }}
              >
                {testimonials.map((testimonial, index) => (
                  <div key={index} className="w-full flex-shrink-0 px-4">
                    <div className="bg-slate-50 dark:bg-slate-900 p-8 rounded-xl shadow-lg border border-slate-200 dark:border-slate-800 max-w-3xl mx-auto">
                      <div className="flex items-center mb-6">
                        <img
                          src={testimonial.avatar || "/placeholder.svg"}
                          alt={testimonial.name}
                          className="h-14 w-14 rounded-full mr-4 object-cover border-2 border-blue-200 dark:border-blue-800"
                        />
                        <div>
                          <h4 className="text-lg font-semibold text-slate-900 dark:text-white">{testimonial.name}</h4>
                          <p className="text-slate-600 dark:text-slate-400">{testimonial.role}</p>
                        </div>
                      </div>
                      <p className="text-lg italic text-slate-700 dark:text-slate-300">"{testimonial.content}"</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-center mt-8 space-x-2">
              {testimonials.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setActiveTestimonial(index)}
                  className={`h-3 w-3 rounded-full transition-colors duration-300 ${
                    activeTestimonial === index ? "bg-blue-600 dark:bg-blue-400" : "bg-slate-300 dark:bg-slate-700"
                  }`}
                  aria-label={`Go to testimonial ${index + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section
        id="contact"
        ref={contactRef}
        className="py-20 px-4 sm:px-6 lg:px-8 bg-slate-50 dark:bg-slate-900 transition-colors duration-300"
      >
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-teal-500 dark:from-blue-400 dark:to-teal-400 bg-clip-text text-transparent">
              Contact Us
            </h2>
            <p className="text-xl text-slate-700 dark:text-slate-300 max-w-3xl mx-auto">
              Have questions or need assistance? Get in touch with our team.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div className="bg-white dark:bg-slate-800 p-8 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
              <h3 className="text-2xl font-semibold mb-6 text-slate-900 dark:text-white">Send Us a Message</h3>
              <form className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Name
                    </label>
                    <input
                      type="text"
                      id="name"
                      className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-md focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent dark:bg-slate-700 dark:text-white"
                      placeholder="Your name"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="email"
                      className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
                    >
                      Email
                    </label>
                    <input
                      type="email"
                      id="email"
                      className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-md focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent dark:bg-slate-700 dark:text-white"
                      placeholder="Your email"
                    />
                  </div>
                </div>
                <div>
                  <label
                    htmlFor="subject"
                    className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
                  >
                    Subject
                  </label>
                  <input
                    type="text"
                    id="subject"
                    className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-md focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent dark:bg-slate-700 dark:text-white"
                    placeholder="Subject"
                  />
                </div>
                <div>
                  <label
                    htmlFor="message"
                    className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
                  >
                    Message
                  </label>
                  <textarea
                    id="message"
                    rows={4}
                    className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-md focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent dark:bg-slate-700 dark:text-white"
                    placeholder="Your message"
                  ></textarea>
                </div>
                <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">Send Message</Button>
              </form>
            </div>

            <div className="flex flex-col space-y-8">
              <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
                <h3 className="text-xl font-semibold mb-4 text-slate-900 dark:text-white">Visit Our Office</h3>
                <div className="flex items-start">
                  <MapPin className="h-5 w-5 text-blue-600 dark:text-blue-400 mr-3 mt-1 flex-shrink-0" />
                  <p className="text-slate-700 dark:text-slate-300">
                    Barangay Poblacion, San Pascual, Batangas, 4204 Philippines
                  </p>
                </div>
                <div className="mt-4 aspect-video w-full rounded-lg overflow-hidden">
                  <img
                    src="/placeholder.svg?height=300&width=500"
                    alt="Office Location Map"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>

              <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700">
                <h3 className="text-xl font-semibold mb-4 text-slate-900 dark:text-white">Contact Information</h3>
                <div className="space-y-4">
                  <div className="flex items-center">
                    <Phone className="h-5 w-5 text-blue-600 dark:text-blue-400 mr-3 flex-shrink-0" />
                    <p className="text-slate-700 dark:text-slate-300">+63 (XXX) XXX-XXXX</p>
                  </div>
                  <div className="flex items-center">
                    <Globe className="h-5 w-5 text-blue-600 dark:text-blue-400 mr-3 flex-shrink-0" />
                    <p className="text-slate-700 dark:text-slate-300">www.jbdtelecom.com</p>
                  </div>
                  <div className="flex items-center">
                    <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400 mr-3 flex-shrink-0" />
                    <div>
                      <p className="text-slate-700 dark:text-slate-300">Monday to Saturday: 8:00 AM – 5:00 PM</p>
                      <p className="text-slate-700 dark:text-slate-300">Sunday: Closed</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <h3 className="text-lg font-semibold mb-4 text-blue-400">JBD Telecom Hub Point</h3>
              <p className="text-slate-400">
                Providing quality telecommunications services in San Pascual, Batangas and beyond.
              </p>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4 text-blue-400">Services</h4>
              <ul className="space-y-2">
                <li>
                  <a href="#" className="text-slate-400 hover:text-white transition-colors">
                    Mobile Network
                  </a>
                </li>
                <li>
                  <a href="#" className="text-slate-400 hover:text-white transition-colors">
                    Internet Solutions
                  </a>
                </li>
                <li>
                  <a href="#" className="text-slate-400 hover:text-white transition-colors">
                    Equipment Sales
                  </a>
                </li>
                <li>
                  <a href="#" className="text-slate-400 hover:text-white transition-colors">
                    Technical Support
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4 text-blue-400">Company</h4>
              <ul className="space-y-2">
                <li>
                  <a href="#" className="text-slate-400 hover:text-white transition-colors">
                    About Us
                  </a>
                </li>
                <li>
                  <a href="#" className="text-slate-400 hover:text-white transition-colors">
                    Careers
                  </a>
                </li>
                <li>
                  <a href="#" className="text-slate-400 hover:text-white transition-colors">
                    News
                  </a>
                </li>
                <li>
                  <a href="#" className="text-slate-400 hover:text-white transition-colors">
                    Contact
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4 text-blue-400">Legal</h4>
              <ul className="space-y-2">
                <li>
                  <a href="#" className="text-slate-400 hover:text-white transition-colors">
                    Privacy Policy
                  </a>
                </li>
                <li>
                  <a href="#" className="text-slate-400 hover:text-white transition-colors">
                    Terms of Service
                  </a>
                </li>
                <li>
                  <a href="#" className="text-slate-400 hover:text-white transition-colors">
                    Cookie Policy
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-slate-800 text-center text-slate-400">
            <p>&copy; {new Date().getFullYear()} JBD Telecom Hub Point. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {/* Add CSS for animations */}
      <style jsx>{`
              @keyframes blob {
                  0% { transform: translate(0px, 0px) scale(1); }
                  33% { transform: translate(30px, -50px) scale(1.1); }
                  66% { transform: translate(-20px, 20px) scale(0.9); }
                  100% { transform: translate(0px, 0px) scale(1); }
              }
              
              @keyframes float {
                  0% { transform: translateY(0px); }
                  50% { transform: translateY(-10px); }
                  100% { transform: translateY(0px); }
              }
              
              @keyframes gradient {
                  0% { background-position: 0% 50%; }
                  50% { background-position: 100% 50%; }
                  100% { background-position: 0% 50%; }
              }
              
              .animate-blob {
                  animation: blob 7s infinite;
              }
              
              .animation-delay-2000 {
                  animation-delay: 2s;
              }
              
              .animate-float {
                  animation: float 6s ease-in-out infinite;
              }
              
              .animate-gradient {
                  background-size: 200% 200%;
                  animation: gradient 15s ease infinite;
              }
              
              .animate-fade-in {
                  opacity: 0;
                  animation: fadeIn 1s forwards;
              }
              
              .animate-fade-in-up {
                  opacity: 0;
                  transform: translateY(20px);
                  animation: fadeInUp 1s forwards;
                  animation-delay: 0.5s;
              }
              
              @keyframes fadeIn {
                  from { opacity: 0; }
                  to { opacity: 1; }
              }
              
              @keyframes fadeInUp {
                  from { 
                      opacity: 0;
                      transform: translateY(20px);
                  }
                  to { 
                      opacity: 1;
                      transform: translateY(0);
                  }
              }
              
              .feature-card.animate-in {
                  animation: featureCardIn 0.6s ease forwards;
              }
              
              @keyframes featureCardIn {
                  from { 
                      opacity: 0;
                      transform: translateY(20px);
                  }
                  to { 
                      opacity: 1;
                      transform: translateY(0);
                  }
              }
          `}</style>
    </div>
  )
}

export default LandingPage

