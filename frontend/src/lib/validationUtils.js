export class StrictEmailValidator {
  constructor() {
    this.allowedDomains = [
      "gmail.com", "yahoo.com", "hotmail.com", "outlook.com",
      "icloud.com", "aol.com", "protonmail.com", "yandex.com", 
      "zoho.com", "gmx.com", "live.com", "msn.com", 
      "icloud.com", "me.com", "mac.com"
    ];
    
    this.commonErrors = {
      "gmial.com": "gmail.com",
      "gmai.com": "gmail.com",
      "gmal.com": "gmail.com",
      "gmaill.com": "gmail.com",
      "gmail.con": "gmail.com",
      "gmail.cm": "gmail.com",
      "gmail.om": "gmail.com",
      "hotmal.com": "hotmail.com",
      "hotmai.com": "hotmail.com",
      "hotmial.com": "hotmail.com",
      "hotmail.con": "hotmail.com",
      "yaho.com": "yahoo.com",
      "yahoo.con": "yahoo.com",
      "outlok.com": "outlook.com",
      "outlook.con": "outlook.com"
    };
  }
  
  levenshteinDistance(s1, s2) {
    if (s1.length < s2.length) return this.levenshteinDistance(s2, s1);
    if (s2.length === 0) return s1.length;
    
    let previousRow = Array.from({ length: s2.length + 1 }, (_, i) => i);
    
    for (let i = 0; i < s1.length; i++) {
      const currentRow = [i + 1];
      
      for (let j = 0; j < s2.length; j++) {
        const insertions = previousRow[j + 1] + 1;
        const deletions = currentRow[j] + 1;
        const substitutions = previousRow[j] + (s1[i] !== s2[j] ? 1 : 0);
        currentRow.push(Math.min(insertions, deletions, substitutions));
      }
      
      previousRow = currentRow;
    }
    
    return previousRow[s2.length];
  }
  
  validateStrictEmail(email) {
    if (!email || email.trim() === '') {
      return {
        valid: null,
        message: "",
        suggestion: ""
      };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return {
        valid: false,
        message: 'Formato de email inválido',
        suggestion: "",
        type: 'invalid_format'
      };
    }
    
    const [user, domain] = email.toLowerCase().split('@');
    
    if (this.allowedDomains.includes(domain)) {
      return {
        valid: true,
        message: "",
        suggestion: "",
        type: 'exact_match'
      };
    }
    
    const suggestion = this.findBestSuggestion(domain);
    
    if (suggestion) {
      return {
        valid: false,
        message: `Dominio de email no permitido: ${domain}`,
        suggestion: `${user}@${suggestion}`,
        originalDomain: domain,
        type: 'domain_not_allowed'
      };
    } else {
      return {
        valid: false,
        message: 'Dominio no permitido. Use: gmail.com, outlook.com, yahoo.com, etc.',
        suggestion: "",
        type: 'domain_not_allowed_no_suggestion'
      };
    }
  }
  
  findBestSuggestion(domain) {
    if (this.commonErrors[domain]) {
      return this.commonErrors[domain];
    }
    
    let bestDomain = null;
    let minDistance = Infinity;
    
    for (const allowedDomain of this.allowedDomains) {
      const distance = this.levenshteinDistance(domain, allowedDomain);
      if (distance < minDistance) {
        minDistance = distance;
        bestDomain = allowedDomain;
      }
    }
    
    if (minDistance <= 2 && minDistance > 0) {
      return bestDomain;
    }
    
    return null;
  }
}

export const validatePassword = (password) => {
  if (!password || password.trim() === '') {
    return {
      isValid: null,
      strength: 0,
      strengthText: '',
      validations: []
    };
  }

  const validations = [
    { test: password.length >= 8, message: 'Mínimo 8 caracteres', key: 'length' },
    { test: /[A-Z]/.test(password), message: 'Una letra mayúscula', key: 'uppercase' },
    { test: /[a-z]/.test(password), message: 'Una letra minúscula', key: 'lowercase' },
    { test: /\d/.test(password), message: 'Un número', key: 'number' },
    { test: /[!@#$%^&*(),.?":{}|<>]/.test(password), message: 'Un carácter especial', key: 'special' }
  ];

  const strength = validations.filter(v => v.test).length;
  let strengthText = '';
  
  if (strength <= 2) strengthText = 'Débil';
  else if (strength <= 4) strengthText = 'Media';
  else strengthText = 'Fuerte';

  return {
    isValid: validations.every(v => v.test),
    strength,
    strengthText,
    validations
  };
};