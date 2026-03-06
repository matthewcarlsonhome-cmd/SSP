# Schema Templates — JSON-LD Reference

## LocalBusiness (homepage)
```json
{
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "@id": "https://example.com/#business",
  "name": "Business Name",
  "description": "Business description with primary service and location.",
  "url": "https://example.com",
  "telephone": "+1-555-123-4567",
  "email": "info@example.com",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "123 Main St",
    "addressLocality": "City",
    "addressRegion": "ST",
    "postalCode": "12345",
    "addressCountry": "US"
  },
  "geo": {
    "@type": "GeoCoordinates",
    "latitude": 0.0,
    "longitude": 0.0
  },
  "areaServed": {
    "@type": "City",
    "name": "City, ST"
  },
  "openingHoursSpecification": [
    {
      "@type": "OpeningHoursSpecification",
      "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      "opens": "08:00",
      "closes": "17:00"
    }
  ],
  "sameAs": [
    "https://www.facebook.com/business",
    "https://www.yelp.com/biz/business",
    "https://g.page/business"
  ],
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.8",
    "reviewCount": "127"
  },
  "priceRange": "$$"
}
```

## Service (service pages)
```json
{
  "@context": "https://schema.org",
  "@type": "Service",
  "name": "Service Name",
  "description": "Detailed description of the service.",
  "provider": {
    "@type": "LocalBusiness",
    "@id": "https://example.com/#business"
  },
  "areaServed": {
    "@type": "City",
    "name": "City, ST"
  },
  "serviceType": "Service Category",
  "offers": {
    "@type": "Offer",
    "priceSpecification": {
      "@type": "PriceSpecification",
      "priceCurrency": "USD",
      "minPrice": "0",
      "maxPrice": "0"
    }
  }
}
```

## FAQPage (any page with FAQ section)
```json
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "Question text here?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Complete answer text here."
      }
    }
  ]
}
```

## BreadcrumbList (every page)
```json
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    {
      "@type": "ListItem",
      "position": 1,
      "name": "Home",
      "item": "https://example.com"
    },
    {
      "@type": "ListItem",
      "position": 2,
      "name": "Services",
      "item": "https://example.com/services"
    },
    {
      "@type": "ListItem",
      "position": 3,
      "name": "Page Title"
    }
  ]
}
```

## Article / BlogPosting (blog/content pages)
```json
{
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  "headline": "Article Title",
  "description": "Article description.",
  "author": {
    "@type": "Person",
    "name": "Author Name",
    "jobTitle": "Title",
    "url": "https://example.com/about"
  },
  "publisher": {
    "@type": "Organization",
    "@id": "https://example.com/#business"
  },
  "datePublished": "2026-01-01",
  "dateModified": "2026-03-01",
  "mainEntityOfPage": "https://example.com/blog/article-slug",
  "image": "https://example.com/images/article-hero.webp"
}
```

## HowTo (process/instructional pages)
```json
{
  "@context": "https://schema.org",
  "@type": "HowTo",
  "name": "How to [Process]",
  "description": "Step-by-step guide.",
  "step": [
    {
      "@type": "HowToStep",
      "name": "Step 1 Title",
      "text": "Step 1 description."
    }
  ],
  "totalTime": "PT2H"
}
```

## WebSite with SearchAction (homepage only, if site has search)
```json
{
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "Business Name",
  "url": "https://example.com",
  "potentialAction": {
    "@type": "SearchAction",
    "target": "https://example.com/search?q={search_term_string}",
    "query-input": "required name=search_term_string"
  }
}
```

## llms.txt Template (place at site root)
```
# Business Name

## About
Brief description of the business, primary services, and service area.

## Services
- Service 1: Brief description
- Service 2: Brief description
- Service 3: Brief description

## Service Areas
- City 1, State
- City 2, State

## Contact
- Website: https://example.com
- Phone: (555) 123-4567
- Email: info@example.com
- Address: 123 Main St, City, ST 12345

## Credentials
- Licensed and insured
- [Relevant certifications]
- [Years in business]
- [Awards or recognitions]
```

## Validation Checklist
After implementing schema:
1. Test every page at https://search.google.com/test/rich-results
2. Validate JSON-LD syntax at https://validator.schema.org/
3. Check for warnings in Google Search Console > Enhancements
4. Verify @id references are consistent across pages
5. Ensure all SameAs URLs are active and point to correct profiles
6. Confirm AggregateRating data matches actual Google review data
7. Verify dateModified is updated when content changes
