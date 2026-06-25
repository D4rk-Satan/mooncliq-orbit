"use client";

import React, { useState } from 'react';

const faqData = [
  {
    question: "How secure is my data?",
    answer: "Your data is secured with enterprise-grade encryption both in transit and at rest. We run on AWS infrastructure, ensuring the highest standards of reliability and compliance."
  },
  {
    question: "Can I import my existing leads?",
    answer: "Absolutely! You can easily import your contacts via CSV or connect directly through our REST API to sync your data instantly."
  },
  {
    question: "What is the Blueprint Engine?",
    answer: "The Blueprint Engine is our proprietary workflow system that enforces strict data governance. It ensures your sales team collects the exact information needed before a lead can move to the next stage."
  },
  {
    question: "Do you integrate with other tools?",
    answer: "Yes, moonCliq seamlessly integrates with popular tools like Google Workspace, Outlook, and Slack to keep your team connected."
  }
];

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState(null);

  const toggleFaq = (index) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section className="faq-section" id="faq">
      <div className="faq-header">
        <h2 className="faq-title">Frequently Asked Questions</h2>
        <p className="faq-subtitle">Everything you need to know about the product and billing.</p>
      </div>
      <div className="faq-list">
        {faqData.map((faq, index) => {
          const isOpen = openIndex === index;
          return (
            <div 
              key={index} 
              className={`faq-item ${isOpen ? 'open' : ''}`}
              onClick={() => toggleFaq(index)}
            >
              <div className="faq-question">
                <h3>{faq.question}</h3>
                <span className="faq-icon">{isOpen ? '−' : '+'}</span>
              </div>
              <div className="faq-answer-wrapper" style={{ height: isOpen ? 'auto' : '0', overflow: 'hidden', transition: 'height 0.3s ease' }}>
                <p className="faq-answer">
                  {faq.answer}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
