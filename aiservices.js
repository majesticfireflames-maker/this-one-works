
import { globalMemory } from './memory';

export class AIService {
  constructor() {
    console.log('✅ AI Service - Always Answers Guaranteed');
    this.conversationHistory = [];
    
    // 🔑 YOUR API KEYS - NO CHANGES
    this.apiKeys = {
      alphaVantage: '67KN0OO9MZS9G8RI',
      apiNinjas: 'uUhgDHXdB3tEwkHQ+Hwmkg==otMMQ2tQ2e55JtQY',
      usda: 'gySh274jvdLR6ceydBRrSSAT6IrdJMePstbcZgn7',
      groq: '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',
      deepseek: 'sk-daa489939d904de19f09bc7cb90dd362',
      openai: 'YOUR_OPENAI_KEY_HERE'
    };
  }

  // ============ MAIN METHOD - NO CHANGES ============
  async getAgentResponse(agentName, message, context = '') {
    console.log(`🧠 ${agentName} processing: "${this.truncate(message, 50)}"`);
    
    this.conversationHistory.push({ role: 'user', content: message });
    
    try {
      if (['nutrition', 'finance', 'fitness'].includes(agentName)) {
        const apiResponse = await this.tryAgentAPI(agentName, message);
        if (apiResponse && apiResponse !== '') {
          console.log(`✅ ${agentName} API success`);
          this.conversationHistory.push({ role: 'assistant', content: apiResponse });
          return apiResponse;
        }
      }
      
      console.log(`⚠️ ${agentName} API failed or not applicable, using AI...`);
      
    } catch (error) {
      console.log(`❌ ${agentName} API error, falling back to AI:`, error.message);
    }
    
    const aiResponse = await this.alwaysAnswerWithAI(agentName, message, context);
    this.conversationHistory.push({ role: 'assistant', content: aiResponse });
    return aiResponse;
  }

  // ============ 🍎 NUTRITION API FIXES ============
  async getNutritionAPI(message) {
    try {
      const foodQuery = this.extractFoodName(message);
      
      if (!foodQuery || foodQuery.length < 2) {
        return null;
      }
      
      console.log(`🍎 Searching nutrition for: "${foodQuery}"`);
      
      // Try USDA API with timeout
      const usdaPromise = this.fetchUSDA(foodQuery).catch(() => null);
      const timeoutPromise = new Promise(resolve => setTimeout(() => resolve(null), 3000));
      
      const usdaData = await Promise.race([usdaPromise, timeoutPromise]);
      
      if (usdaData && usdaData.calories > 0) {
        return `🍎 **Nutrition Facts for ${usdaData.name}**\n\n` +
               `Calories: ${usdaData.calories} kcal\n` +
               `Protein: ${usdaData.protein}g\n` +
               `Carbohydrates: ${usdaData.carbs}g\n` +
               `Fat: ${usdaData.fats}g\n\n` +
               `*Based on USDA Food Database*\n\n` +
               `I've logged this in your nutrition tracker!`;
      }
      
      // Fallback to AI-based nutrition estimation
      console.log('USDA API returned no data, trying AI estimation...');
      const aiNutrition = await this.estimateNutritionWithAI(foodQuery);
      if (aiNutrition) {
        return aiNutrition;
      }
      
    } catch (error) {
      console.log('Nutrition API failed:', error.message);
    }
    
    return null;
  }

  // ============ CRITICAL FIX: BETTER FOOD EXTRACTION ============
  extractFoodName(message) {
    if (!message || typeof message !== 'string') return 'mixed meal';
    
    const lowerMsg = message.toLowerCase();
    
    // 1. Try explicit patterns first
    const patterns = [
      // "I ate curry rice for lunch"
      /(?:i\s+)?(?:ate|had|eat|consumed|logged)\s+(?:a\s+)?(?:piece\s+of\s+)?(?:some\s+)?["']?([^.,!?0-9]{2,}?)(?:\s+(?:for|with|and|,|\.|!|\?|$))/i,
      
      // "log curry rice please"
      /log\s+(?:my\s+)?(?:meal\s+)?(?:of\s+)?["']?([^"'.!?0-9]{2,})(?:\s+please)?/i,
      
      // "curry rice for dinner"
      /([a-z][^.!?0-9]{2,}?)\s+(?:for\s+(?:breakfast|lunch|dinner|snack|meal))/i,
      
      // "add curry rice to meals"
      /(?:add|save|record)\s+(?:to\s+)?(?:my\s+)?(?:meal|food)\s*(?:as\s+)?["']?([^"'.!?0-9]{2,})/i,
      
      // "my meal was curry rice"
      /(?:my\s+)?(?:meal|food|snack)\s+(?:was|is)\s+["']?([^"'.!?0-9]{2,})/i,
      
      // "just had curry rice"
      /(?:just\s+)?(?:had|finished)\s+["']?([^"'.!?0-9]{2,})/i,
      
      // "pizza" (single word food)
      /\b(pizza|burger|salad|pasta|rice|curry|chicken|fish|soup|steak|taco|burrito|sandwich|sushi|ramen|noodles)\b/i
    ];
    
    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match && match[1]) {
        const food = match[1].trim();
        if (food.length >= 2 && food.length <= 50) {
          const cleanFood = food
            .replace(/\s+(?:please|thanks|thank you|\.|,|!|\?|ok|okay|now)$/i, '')
            .replace(/^(a|an|the|some)\s+/i, '')
            .trim();
          
          if (cleanFood.length >= 2) {
            console.log(`🍎 Extracted food: "${cleanFood}"`);
            return cleanFood;
          }
        }
      }
    }
    
    // 2. Look for common food words
    const commonFoods = [
      'pizza', 'burger', 'sandwich', 'salad', 'pasta', 'rice', 'curry', 
      'chicken', 'beef', 'fish', 'soup', 'steak', 'taco', 'burrito',
      'fruit', 'apple', 'banana', 'orange', 'berries', 'vegetable',
      'bread', 'toast', 'cereal', 'oatmeal', 'yogurt', 'cheese',
      'egg', 'eggs', 'bacon', 'sausage', 'noodle', 'ramen', 'sushi',
      'cake', 'cookie', 'chocolate', 'ice cream', 'pudding', 'dessert'
    ];
    
    const words = lowerMsg.split(/[\s,.!?]+/);
    
    for (const word of words) {
      if (word.length > 2) {
        for (const food of commonFoods) {
          if (word === food || word.includes(food) || food.includes(word)) {
            console.log(`🍎 Found food word: "${food}"`);
            return food;
          }
        }
      }
    }
    
    // 3. Last resort: Take descriptive words
    const skipWords = new Set([
      'i', 'ate', 'had', 'eat', 'eating', 'consumed', 'logged', 
      'my', 'a', 'an', 'the', 'some', 'for', 'with', 'and',
      'please', 'thanks', 'thank', 'you', 'just', 'now', 'today',
      'yesterday', 'breakfast', 'lunch', 'dinner', 'snack', 'meal'
    ]);
    
    const contentWords = words.filter(w => 
      w.length > 2 && 
      !skipWords.has(w) && 
      !w.match(/^\d+$/) // Skip numbers
    );
    
    if (contentWords.length >= 1) {
      const extracted = contentWords.slice(0, 3).join(' ');
      console.log(`🍎 Fallback extraction: "${extracted}"`);
      return extracted;
    }
    
    console.log(`⚠️ Could not extract food name, using default`);
    return 'mixed meal';
  }

  // ============ USDA API CALL FIX ============
  async fetchUSDA(foodName) {
    try {
      console.log(`🔍 Searching USDA for: "${foodName}"`);
      
      // Simplify food name for better matching
      const simpleName = foodName.toLowerCase().split(' ')[0];
      
      const response = await fetch(
        `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${this.apiKeys.usda}&query=${encodeURIComponent(simpleName)}&pageSize=5`
      );
      
      if (!response.ok) {
        console.log(`USDA API error: ${response.status}`);
        return null;
      }
      
      const data = await response.json();
      
      if (data.foods && data.foods.length > 0) {
        const food = data.foods[0];
        
        // Extract nutrition data
        const nutrients = {};
        if (food.foodNutrients) {
          food.foodNutrients.forEach(nutrient => {
            if (nutrient.nutrientName && nutrient.value) {
              const name = nutrient.nutrientName.toLowerCase();
              if (name.includes('energy') || name.includes('calories')) {
                nutrients.calories = Math.round(nutrient.value);
              } else if (name.includes('protein')) {
                nutrients.protein = Math.round(nutrient.value);
              } else if (name.includes('carbohydrate')) {
                nutrients.carbs = Math.round(nutrient.value);
              } else if (name.includes('total fat') || name.includes('fat, total')) {
                nutrients.fats = Math.round(nutrient.value);
              }
            }
          });
        }
        
        // Fill missing values with reasonable defaults
        const result = {
          name: food.description || foodName,
          calories: nutrients.calories || this.estimateCalories(foodName),
          protein: nutrients.protein || 10,
          carbs: nutrients.carbs || 20,
          fats: nutrients.fats || 8
        };
        
        console.log(`✅ USDA found: ${result.name} - ${result.calories} calories`);
        return result;
      }
      
      return null;
      
    } catch (error) {
      console.log('USDA API error:', error.message);
      return null;
    }
  }

  // Helper: Estimate calories based on food type
  estimateCalories(foodName) {
    const lowerName = foodName.toLowerCase();
    
    if (lowerName.includes('salad') || lowerName.includes('vegetable')) return 150;
    if (lowerName.includes('chicken') || lowerName.includes('fish')) return 250;
    if (lowerName.includes('pizza') || lowerName.includes('burger')) return 350;
    if (lowerName.includes('rice') || lowerName.includes('pasta')) return 200;
    if (lowerName.includes('fruit')) return 100;
    
    return 250; // Default
  }

  // ============ AI NUTRITION ESTIMATION ============
  async estimateNutritionWithAI(foodName) {
    try {
      console.log(`🤖 AI estimating nutrition for: ${foodName}`);
      
      const prompt = `As a nutritionist, estimate the nutrition for "${foodName}" (per typical serving). 
      Provide in this exact format:
      Name: ${foodName}
      Calories: [number] kcal
      Protein: [number] g
      Carbs: [number] g
      Fats: [number] g
      Note: [brief healthy eating tip about this food]`;
      
      const response = await this.callGroq('nutrition', prompt, 'nutrition estimation');
      
      if (response && response.includes('Calories:')) {
        return `🍎 **Estimated Nutrition**\n\n${response}\n\n*AI estimation - for accurate tracking, consult a nutritionist*`;
      }
      
    } catch (error) {
      console.log('AI nutrition estimation failed:', error.message);
    }
    
    // Final fallback
    return `🍎 **${foodName} logged**\nI've added "${foodName}" to your meal log. For detailed nutrition info, try being more specific (e.g., "grilled chicken salad" instead of "salad").`;
  }

  // ============ GROQ API CALL (NO CHANGES) ============
  async callGroq(agentName, message, context) {
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKeys.groq}`
        },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          messages: [
            {
              role: 'system',
              content: this.getSystemPrompt(agentName) + (context ? `\nContext: ${context}` : '')
            },
            { role: 'user', content: message }
          ],
          max_tokens: 500,
          temperature: 0.7
        })
      });
      
      const data = await response.json();
      return data.choices?.[0]?.message?.content || null;
    } catch (error) {
      console.log('Groq call error:', error.message);
      return null;
    }
  }

  // ============ UTILITY METHODS ============
  truncate(text, length) {
    if (!text || typeof text !== 'string') return '';
    if (text.length <= length) return text;
    return text.substring(0, length) + '...';
  }

  getSystemPrompt(agentName) {
    const prompts = {
      nutrition: `You are a certified nutritionist and dietitian. Provide accurate nutritional information, meal planning advice, and healthy eating tips. When users log meals, acknowledge them and provide relevant nutritional insights. Be supportive and educational.`,
      finance: `You are a financial advisor with expertise in investments, budgeting, and wealth management. Provide practical financial advice, explain concepts clearly, and help users understand their finances better. Be precise with numbers.`,
      fitness: `You are a certified personal trainer and fitness coach. Provide safe exercise advice, workout routines, and fitness tips. Emphasize proper form and gradual progression. Be motivational but realistic.`,
      mental: `You are a compassionate mental wellness coach. Provide supportive, non-judgmental guidance for stress management, mindfulness, and emotional well-being. Always prioritize mental health safety.`,
      creative: `You are a creative collaborator and artistic consultant. Help users brainstorm ideas, provide creative feedback, and inspire artistic projects. Be imaginative and encouraging.`,
      planner: `You are a productivity expert and planning specialist. Help users organize tasks, manage time effectively, and achieve their goals. Provide practical, actionable advice.`,
      general: `You are Aura Prime, a helpful AI assistant. You coordinate with specialized agents (nutrition, finance, fitness, mental, creative, planner) to provide comprehensive assistance. Be knowledgeable, friendly, and proactive in helping users.`
    };
    
    return prompts[agentName] || prompts.general;
  }

  // ============ OTHER AGENT API METHODS (NO CHANGES) ============
  async tryAgentAPI(agentName, message) {
    const lowerMsg = message.toLowerCase();
    
    switch(agentName) {
      case 'nutrition':
        if (this.isNutritionQuery(lowerMsg)) {
          return await this.getNutritionAPI(message);
        }
        break;
        
      case 'finance':
        if (this.isFinanceQuery(lowerMsg)) {
          return await this.getFinanceAPI(message);
        }
        break;
        
      case 'fitness':
        if (this.isFitnessQuery(lowerMsg)) {
          return await this.getFitnessAPI(message);
        }
        break;
    }
    
    return null;
  }

  isNutritionQuery(message) {
    const keywords = ['eat', 'ate', 'food', 'meal', 'calori', 'nutrit', 'dinner', 'lunch', 'breakfast', 'snack', 'diet', 'healthy', 'unhealthy', 'fruit', 'vegetable', 'protein', 'carb', 'fat'];
    return keywords.some(keyword => message.includes(keyword));
  }

  isFinanceQuery(message) {
    const keywords = ['stock', 'price', 'invest', 'money', 'save', 'budget', 'cash', '$', 'usd', 'eur', 'gbp', 'jpy', 'currency', 'exchange', 'rate', 'bitcoin', 'crypto', 'wealth', 'rich', 'poor', 'debt'];
    return keywords.some(keyword => message.includes(keyword));
  }

  isFitnessQuery(message) {
    const keywords = ['exercise', 'workout', 'muscle', 'lift', 'gym', 'run', 'cardio', 'weight', 'train', 'fitness', 'strong', 'weak', 'body', 'health', 'calories burned', 'burn', 'active'];
    return keywords.some(keyword => message.includes(keyword));
  }

  async alwaysAnswerWithAI(agentName, message, context) {
    console.log(`🤖 AI Thinking for ${agentName}...`);
    
    const recentHistory = this.conversationHistory.slice(-10);
    
    // Try Groq
    try {
      const groqResponse = await this.callGroqWithHistory(agentName, message, recentHistory);
      if (groqResponse && groqResponse.length > 20) {
        return groqResponse;
      }
    } catch (error) {
      console.log('Groq failed:', error.message);
    }
    
    // Try DeepSeek
    try {
      const deepseekResponse = await this.callDeepSeekWithHistory(agentName, message, recentHistory);
      if (deepseekResponse && deepseekResponse.length > 20) {
        return deepseekResponse;
      }
    } catch (error) {
      console.log('DeepSeek failed:', error.message);
    }
    
    // Local fallback
    return this.getLocalFallback(agentName, message);
  }

  async callGroqWithHistory(agentName, message, history) {
    const systemPrompt = this.getSystemPrompt(agentName);
    
    const messages = [
      { role: 'system', content: systemPrompt },
      ...history.map(msg => ({ role: msg.role, content: msg.content })),
      { role: 'user', content: message }
    ];
    
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKeys.groq}`
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: messages,
        max_tokens: 800,
        temperature: 0.7,
        stream: false
      })
    });
    
    if (!response.ok) {
      throw new Error(`Groq API error: ${response.status}`);
    }
    
    const data = await response.json();
    return data.choices?.[0]?.message?.content?.trim() || null;
  }

  async callDeepSeekWithHistory(agentName, message, history) {
    const systemPrompt = this.getSystemPrompt(agentName);
    
    const messages = [
      { role: 'system', content: systemPrompt },
      ...history.slice(-6).map(msg => ({ role: msg.role, content: msg.content })),
      { role: 'user', content: message }
    ];
    
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKeys.deepseek}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: messages,
        max_tokens: 800,
        temperature: 0.7
      })
    });
    
    if (!response.ok) {
      throw new Error(`DeepSeek API error: ${response.status}`);
    }
    
    const data = await response.json();
    return data.choices?.[0]?.message?.content?.trim() || null;
  }

  getLocalFallback(agentName, message) {
    const fallbacks = {
      nutrition: `I understand you're asking about nutrition. Regarding "${this.truncate(message, 50)}...", here's some general advice: Focus on balanced meals with vegetables, lean proteins, and whole grains. Stay hydrated!`,
      finance: `Regarding your finance question: "${this.truncate(message, 50)}...". Good financial principles include saving regularly, investing wisely, and maintaining an emergency fund.`,
      fitness: `For your fitness query: "${this.truncate(message, 50)}...". Remember that consistency is key - regular exercise beats occasional intense workouts.`,
      general: `I'm here to help! Regarding "${this.truncate(message, 50)}...", could you provide more details?`,
      creative: `That's an interesting creative thought! "${this.truncate(message, 50)}..." has potential. Let's explore this further.`,
      planner: `For planning "${this.truncate(message, 50)}...", break it into smaller tasks and set deadlines.`,
      mental: `Thank you for sharing. Regarding "${this.truncate(message, 50)}...", remember to practice self-care and reach out if you need support.`
    };
    
    return fallbacks[agentName] || `I'm here to help with "${this.truncate(message, 50)}...". Tell me more!`;
  }

  // === FINANCE API METHODS (NO CHANGES) ===
  async getFinanceAPI(message) {
    try {
      const lowerMsg = message.toLowerCase();
      
      // Stock query
      const stockMatch = message.match(/\$([A-Z]{1,5})\b|\b([A-Z]{1,5})\s+(?:stock|price|share)/i);
      if (stockMatch) {
        const symbol = (stockMatch[1] || stockMatch[2] || '').toUpperCase();
        if (symbol && symbol.length <= 5) {
          return await this.fetchStockData(symbol);
        }
      }
      
      // Currency exchange
      if (lowerMsg.includes('exchange rate') || lowerMsg.includes('convert') || 
          (lowerMsg.includes('usd') && lowerMsg.includes('to'))) {
        return await this.fetchExchangeRates(message);
      }
      
      // Crypto
      if (lowerMsg.includes('bitcoin') || lowerMsg.includes('crypto') || 
          lowerMsg.includes('ethereum') || lowerMsg.match(/\$[A-Z]{3,}/)) {
        return await this.fetchCryptoData(message);
      }
      
    } catch (error) {
      console.log('Finance API failed:', error.message);
    }
    
    return null;
  }

  // === FITNESS API METHODS (NO CHANGES) ===
  async getFitnessAPI(message) {
    try {
      const lowerMsg = message.toLowerCase();
      
      if (lowerMsg.includes('exercise') || lowerMsg.includes('workout') || 
          lowerMsg.includes('muscle') || lowerMsg.includes('how to')) {
        
        let muscle = this.extractMuscleGroup(lowerMsg);
        if (!muscle) muscle = 'all';
        
        return await this.fetchExercises(muscle, message);
      }
      
      if (lowerMsg.includes('calories') && (lowerMsg.includes('burn') || lowerMsg.includes('burned'))) {
        return await this.estimateCaloriesBurned(message);
      }
      
    } catch (error) {
      console.log('Fitness API failed:', error.message);
    }
    
    return null;
  }

  
  // ============ 🧠 ALWAYS ANSWERS WITH AI ============
  async alwaysAnswerWithAI(agentName, message, context) {
    console.log(`🤖 AI Thinking for ${agentName}...`);
    
    // Get the last 5 messages for context
    const recentHistory = this.conversationHistory.slice(-10);
    
    // Try Groq first (fastest)
    try {
      const groqResponse = await this.callGroqWithHistory(agentName, message, recentHistory);
      if (groqResponse && groqResponse.length > 20) {
        return groqResponse;
      }
    } catch (error) {
      console.log('Groq failed:', error.message);
    }
    
    // Try DeepSeek
    try {
      const deepseekResponse = await this.callDeepSeekWithHistory(agentName, message, recentHistory);
      if (deepseekResponse && deepseekResponse.length > 20) {
        return deepseekResponse;
      }
    } catch (error) {
      console.log('DeepSeek failed:', error.message);
    }
    
    // ULTIMATE FALLBACK - Local response
    return this.getLocalFallback(agentName, message);
  }

  async callGroqWithHistory(agentName, message, history) {
    const systemPrompt = this.getSystemPrompt(agentName);
    
    const messages = [
      { role: 'system', content: systemPrompt },
      ...history.map(msg => ({ role: msg.role, content: msg.content })),
      { role: 'user', content: message }
    ];
    
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKeys.groq}`
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: messages,
        max_tokens: 800,
        temperature: 0.7,
        stream: false
      })
    });
    
    if (!response.ok) {
      throw new Error(`Groq API error: ${response.status}`);
    }
    
    const data = await response.json();
    return data.choices?.[0]?.message?.content?.trim() || null;
  }

  async callDeepSeekWithHistory(agentName, message, history) {
    const systemPrompt = this.getSystemPrompt(agentName);
    
    const messages = [
      { role: 'system', content: systemPrompt },
      ...history.slice(-6).map(msg => ({ role: msg.role, content: msg.content })),
      { role: 'user', content: message }
    ];
    
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKeys.deepseek}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: messages,
        max_tokens: 800,
        temperature: 0.7
      })
    });
    
    if (!response.ok) {
      throw new Error(`DeepSeek API error: ${response.status}`);
    }
    
    const data = await response.json();
    return data.choices?.[0]?.message?.content?.trim() || null;
  }

  getSystemPrompt(agentName) {
    const prompts = {
      nutrition: `You are a certified nutritionist and dietitian. Provide accurate nutritional information, meal planning advice, and healthy eating tips. When users log meals, acknowledge them and provide relevant nutritional insights. Be supportive and educational.`,
      finance: `You are a financial advisor with expertise in investments, budgeting, and wealth management. Provide practical financial advice, explain concepts clearly, and help users understand their finances better. Be precise with numbers.`,
      fitness: `You are a certified personal trainer and fitness coach. Provide safe exercise advice, workout routines, and fitness tips. Emphasize proper form and gradual progression. Be motivational but realistic.`,
      mental: `You are a compassionate mental wellness coach. Provide supportive, non-judgmental guidance for stress management, mindfulness, and emotional well-being. Always prioritize mental health safety.`,
      creative: `You are a creative collaborator and artistic consultant. Help users brainstorm ideas, provide creative feedback, and inspire artistic projects. Be imaginative and encouraging.`,
      planner: `You are a productivity expert and planning specialist. Help users organize tasks, manage time effectively, and achieve their goals. Provide practical, actionable advice.`,
      general: `You are Aura Prime, a helpful AI assistant. You coordinate with specialized agents (nutrition, finance, fitness, mental, creative, planner) to provide comprehensive assistance. Be knowledgeable, friendly, and proactive in helping users.`
    };
    
    return prompts[agentName] || prompts.general;
  }

  getLocalFallback(agentName, message) {
    const fallbacks = {
      nutrition: `I understand you're asking about nutrition or food. For "${message.substring(0, 50)}...", here's some general advice: Focus on balanced meals with plenty of vegetables, lean proteins, and whole grains. Stay hydrated and listen to your body's hunger cues.`,
      finance: `Regarding your finance question about "${message.substring(0, 50)}...": A good financial principle is to save at least 20% of income, invest for the long term, and maintain an emergency fund. Diversification reduces risk.`,
      fitness: `For your fitness question: "${message.substring(0, 50)}...". Remember that consistency beats intensity - regular moderate exercise is better than occasional intense workouts. Always warm up and cool down.`,
      general: `I'm here to help! Regarding "${message.substring(0, 50)}...", could you provide a bit more detail so I can assist you better?`,
      creative: `That's an interesting creative thought! "${message.substring(0, 50)}..." has potential. Let's explore this idea further together.`,
      planner: `For planning "${message.substring(0, 50)}...", breaking it into smaller tasks and setting deadlines can help. Prioritize what's most important.`,
      mental: `Thank you for sharing. Regarding "${message.substring(0, 50)}...", remember that it's okay to take things one step at a time. Self-care is important.`
    };
    
    return fallbacks[agentName] || `I'm here to help with "${message.substring(0, 50)}...". Could you tell me more about what you need?`;
  }

  // ============ HELPER METHODS ============
  isNutritionQuery(message) {
    const keywords = ['eat', 'ate', 'food', 'meal', 'calori', 'nutrit', 'dinner', 'lunch', 'breakfast', 'snack', 'diet', 'healthy', 'unhealthy', 'fruit', 'vegetable', 'protein', 'carb', 'fat'];
    return keywords.some(keyword => message.includes(keyword));
  }

  isFinanceQuery(message) {
    const keywords = ['stock', 'price', 'invest', 'money', 'save', 'budget', 'cash', '$', 'usd', 'eur', 'gbp', 'jpy', 'currency', 'exchange', 'rate', 'bitcoin', 'crypto', 'wealth', 'rich', 'poor', 'debt'];
    return keywords.some(keyword => message.includes(keyword));
  }

  isFitnessQuery(message) {
    const keywords = ['exercise', 'workout', 'muscle', 'lift', 'gym', 'run', 'cardio', 'weight', 'train', 'fitness', 'strong', 'weak', 'body', 'health', 'calories burned', 'burn', 'active'];
    return keywords.some(keyword => message.includes(keyword));
  }

  extractFoodName(message) {
    // Common patterns for food logging
    const patterns = [
      /(?:ate|had|eat|consumed|logged)\s+(?:a\s+)?(?:piece\s+of\s+)?(?:some\s+)?["']?([^"',.!?0-9]+?)(?:\s+(?:with|and|,|\.|!|\?|$))/i,
      /(?:food|meal|snack)\s+(?:called\s+)?["']?([^"'.!?0-9]+)/i,
      /log\s+(?:my\s+)?(?:meal\s+)?(?:of\s+)?["']?([^"'.!?0-9]+)/i
    ];
    
    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match && match[1]) {
        const food = match[1].trim();
        if (food.length > 1 && food.length < 50) {
          return food;
        }
      }
    }
    
    // Fallback: take first 3 words that aren't common verbs
    const words = message.split(' ').slice(0, 5);
    const skipWords = ['i', 'want', 'would', 'like', 'to', 'have', 'had', 'ate', 'eat', 'my', 'a', 'the', 'some'];
    const foodWords = words.filter(word => !skipWords.includes(word.toLowerCase()) && word.length > 2);
    
    return foodWords.slice(0, 3).join(' ') || 'mixed meal';
  }

  async callGroq(agentName, message, context) {
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKeys.groq}`
        },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          messages: [
            {
              role: 'system',
              content: this.getSystemPrompt(agentName) + (context ? `\nContext: ${context}` : '')
            },
            { role: 'user', content: message }
          ],
          max_tokens: 500,
          temperature: 0.7
        })
      });
      
      const data = await response.json();
      return data.choices?.[0]?.message?.content || null;
    } catch (error) {
      console.log('Groq call error:', error.message);
      return null;
    }
  }

  getAgentRole(agentName) {
    const roles = {
      nutrition: 'nutrition expert and dietitian',
      finance: 'financial advisor and investment expert',
      fitness: 'personal trainer and fitness coach',
      general: 'helpful assistant',
      creative: 'creative partner',
      planner: 'productivity expert',
      mental: 'mental wellness coach'
    };
    return roles[agentName] || 'helpful assistant';
  }
}

// Export as default
export default AIService;