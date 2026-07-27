export interface DietRecommendation {
  breakfast: string
  lunch: string
  dinner: string
  glycemicIndex: string
  calorieEstimate: string
  notes: string
  clinicalNote: string
  homeCareNote: string
}

interface UserProfile {
  dietaryPreferences?: string[]
  activeDiseases?: string[]
  weightKg?: string
  heightCm?: string
}

function hasDisease(user: UserProfile, keywords: string[]): boolean {
  return (user.activeDiseases || []).some(d =>
    keywords.some(kw => d.toLowerCase().includes(kw))
  )
}

function isDiabetic(user: UserProfile): boolean {
  return hasDisease(user, ["diabet", "sugar", "glucose", "metformin"])
}

function isVeg(user: UserProfile): boolean {
  const prefs = (user.dietaryPreferences || []).map(p => p.toLowerCase())
  return prefs.includes("vegetarian") || prefs.includes("vegan") || prefs.includes("eggetarian") || prefs.includes("jain")
}

function isNonVeg(user: UserProfile): boolean {
  return (user.dietaryPreferences || []).some(p => p.toLowerCase().includes("non veg"))
}

function isVegan(user: UserProfile): boolean {
  return (user.dietaryPreferences || []).some(p => p.toLowerCase() === "vegan")
}

function getBmi(user: UserProfile): number | null {
  const w = parseFloat(user.weightKg || "")
  const h = parseFloat(user.heightCm || "")
  if (!w || !h || h <= 0) return null
  return w / ((h / 100) * (h / 100))
}

export function getDietRecommendation(user: UserProfile): DietRecommendation {
  const diabetic = isDiabetic(user)
  const veg = isVeg(user)
  const nonVeg = isNonVeg(user)
  const vegan = isVegan(user)
  const bmi = getBmi(user)
  const hasHeartDisease = hasDisease(user, ["heart", "cardio", "cholesterol"])
  const hasHighBP = hasDisease(user, ["high blood pressure", "hypertension"])
  const hasThyroid = hasDisease(user, ["thyroid"])
  const hasKidney = hasDisease(user, ["kidney"])
  const hasGastric = hasDisease(user, ["gastric", "gerd", "acid reflux", "acidity"])
  const hasFattyLiver = hasDisease(user, ["fatty liver"])
  const hasAnemia = hasDisease(user, ["anemia", "iron"])
  const isOverweight = bmi !== null && bmi >= 25
  const isObese = bmi !== null && bmi >= 30

  if (diabetic) {
    return {
      breakfast: "Steel-cut oatmeal with walnuts, chia seeds, and cinnamon. Avoid sweet fruits — opt for half a pear or berries if fruit is desired.",
      lunch: "2 whole-wheat chapatis, bitter gourd or methi sabzi, masoor dal, and a small portion of brown rice. Include a side salad with cucumber and lemon.",
      dinner: "1-2 multigrain chapatis with lauki (bottle gourd) sabzi and a light mung bean soup. Finish by 7 PM.",
      glycemicIndex: "< 53 GI (Low — Diabetic safe)",
      calorieEstimate: "1,600 - 1,900 kcal",
      notes: "Strictly limit sweet fruits, fruit juices, and refined carbs. Monitor post-meal glucose consistently.",
      clinicalNote: "Your Diabetic profile requires low-glycemic-index foods to prevent glucose spikes. Sweets and high-GI carbs are restricted.",
      homeCareNote: "Monitor blood sugar levels regularly. For mild hypoglycemia (sweating, dizziness), keep 15g fast-acting glucose (3-4 glucose tablets) handy. Seek medical care for persistent high readings above 300 mg/dL.",
    }
  }

  if (hasHeartDisease || hasHighBP) {
    return {
      breakfast: "Oatmeal with flaxseeds, walnuts, and blueberries. Avoid salted butter or high-sodium breads.",
      lunch: "2-3 whole-wheat chapatis, low-sodium dal, seasonal veg sabzi cooked with minimal salt, and steamed brown rice. Use herbs for flavor instead of salt.",
      dinner: "1-2 chapatis or quinoa bowl with grilled vegetables and a light yogurt raita. Avoid heavy creams and fried foods.",
      glycemicIndex: "< 55 GI (Heart-healthy balance)",
      calorieEstimate: "1,700 - 2,000 kcal",
      notes: "Limit sodium to < 1500 mg/day. Avoid processed foods, pickles, papad. Include omega-3 sources like flaxseeds and walnuts daily.",
      clinicalNote: "Your cardiovascular profile demands low-sodium, heart-healthy nutrition. Saturated fats and high-salt foods are avoided.",
      homeCareNote: "Daily light cardiovascular activity (brisk walk 30-45 min) complements the dietary plan. Monitor BP regularly. Seek immediate care for chest pain or severe breathlessness.",
    }
  }

  if (hasKidney) {
    return {
      breakfast: "Low-protein options like apple, white rice poha, or vermicelli upma. Avoid high-potassium fruits (banana, orange, dried fruits).",
      lunch: "1-2 chapatis (use low-protein flour if available), pumpkin or bottle gourd sabzi, and a small portion of white rice with light dal. Limit dal portion.",
      dinner: "Rice or khichdi made with low-protein grains, boiled vegetables, and a small serving of curd. Avoid heavy protein meals.",
      glycemicIndex: "< 55 GI (Renal-friendly)",
      calorieEstimate: "1,500 - 1,800 kcal",
      notes: "Protein intake should be moderated based on your CKD stage. Limit potassium, phosphorus, and sodium. Consult nephrologist for exact macros.",
      clinicalNote: "Your renal profile requires controlled protein, potassium, and phosphorus intake. Strict dietary compliance is essential.",
      homeCareNote: "Stay hydrated as per your nephrologist's advice (fluid intake may be restricted). Monitor for swelling, breathlessness, or fatigue. Regular lab work is essential.",
    }
  }

  if (hasThyroid) {
    return {
      breakfast: "Cooked vegetables (avoid raw cruciferous in large amounts), eggs or plant protein, and gluten-free grains like quinoa or buckwheat.",
      lunch: "2 chapatis, seasonal sabzi, dal, and brown rice. Include good selenium sources — brazil nuts (1-2 daily), tuna, or sunflower seeds.",
      dinner: "Light meal with grilled fish or paneer, steamed vegetables, and a small quinoa bowl. Avoid soy and millets in large quantities.",
      glycemicIndex: "< 55 GI (Thyroid-supportive)",
      calorieEstimate: "1,700 - 2,100 kcal",
      notes: "Take thyroid medication on an empty stomach (30-60 min before food). Limit raw cruciferous vegetables (cabbage, cauliflower, broccoli). Include selenium and zinc-rich foods.",
      clinicalNote: "Your thyroid profile benefits from consistent iodine and selenium intake. Take medication strictly on an empty stomach in the morning.",
      homeCareNote: "Take levothyroxine 30-60 min before breakfast on empty stomach. Avoid calcium/iron supplements within 4 hours. Track TSH levels as recommended by your endocrinologist.",
    }
  }

  if (hasGastric) {
    return {
      breakfast: "Small, easily digestible meal like ripe banana, cooked apple, oatmeal with low-fat milk, or rice flakes (poha). Avoid citrus and spicy foods.",
      lunch: "2 chapatis (avoid fried parathas), simple moong dal, bland seasonal sabzi (pumpkin, potato, lauki), and steamed rice.",
      dinner: "1-2 chapatis or rice khichdi with curd. Eat at least 2-3 hours before lying down. Avoid onions, garlic, and heavy spices.",
      glycemicIndex: "< 55 GI (Gentle on stomach)",
      calorieEstimate: "1,600 - 1,900 kcal",
      notes: "Eat small, frequent meals. Avoid lying down for 2-3 hours after eating. Limit spicy, fried, and acidic foods. Avoid tea/coffee on empty stomach.",
      clinicalNote: "Your gastric profile benefits from small, frequent low-acid meals. Avoid trigger foods that cause reflux or bloating.",
      homeCareNote: "Elevate head of bed by 6-8 inches to prevent nighttime reflux. Take PPI medication 30 min before breakfast if prescribed. Consult gastroenterologist if symptoms persist beyond 2 weeks.",
    }
  }

  if (hasFattyLiver || isOverweight || isObese) {
    return {
      breakfast: "High-protein options like besan chilla (gram flour pancake) or egg whites, with vegetables. Avoid refined flour items and sugary cereals.",
      lunch: "2 chapatis (opt for multigrain), high-fiber sabzi, low-oil dal, and a small portion of brown rice or quinoa. Include a generous salad.",
      dinner: "Grilled paneer or tofu with sautéed vegetables. Skip rice and limit chapati to 1 piece. No carbs after 7 PM.",
      glycemicIndex: "< 50 GI (Weight management)",
      calorieEstimate: "1,400 - 1,700 kcal",
      notes: "Calorie deficit is key. Aim for 500 kcal below maintenance. Eliminate sugar, refined flour, fried foods, and sugary drinks. Increase protein to 1.2-1.5 g/kg body weight.",
      clinicalNote: hasFattyLiver
        ? "Your Fatty Liver profile requires a low-fat, low-sugar diet with calorie control. Avoid alcohol completely."
        : "Your weight management plan focuses on sustainable calorie deficit with adequate protein to preserve muscle mass.",
      homeCareNote: hasFattyLiver
        ? "Avoid alcohol and high-fructose corn syrup entirely. Aim for 30-45 min of moderate exercise daily. Weight loss of 5-10% can significantly improve liver health."
        : "Track calories with a reliable app. Aim for 30 min of physical activity daily. Slow, steady weight loss (0.5-1 kg/week) is sustainable.",
    }
  }

  if (hasAnemia) {
    return {
      breakfast: "Iron-rich options like spinach paratha, beetroot juice, or fortified cereal. Pair with vitamin C (lemon, orange) to enhance absorption.",
      lunch: "2-3 chapatis, green leafy sabzi (spinach, methi), sprouted moong salad, and brown rice. Include a lemon wedge.",
      dinner: "Lentil soup (dal) with amaranth or quinoa, sautéed greens, and a small serving of jaggery and sesame seeds for iron.",
      glycemicIndex: "< 55 GI (Iron-rich balance)",
      calorieEstimate: "1,800 - 2,100 kcal",
      notes: "Combine iron-rich foods with vitamin C (lemon juice, amla, citrus). Avoid tea/coffee within 1 hour of iron-rich meals. Include iron cookware if possible.",
      clinicalNote: "Your anemic profile requires iron-dense nutrition. Vitamin C pairing significantly improves non-heme iron absorption.",
      homeCareNote: "Take iron supplements on an empty stomach if tolerated. Avoid milk, tea, or coffee within 1 hour of iron intake. Get follow-up hemoglobin testing in 4-6 weeks.",
    }
  }

  if (veg || vegan) {
    return {
      breakfast: vegan
        ? "Smoothie bowl with plant-based milk, oats, berries, flaxseeds, and a tablespoon of almond butter."
        : "Fresh whole apple or sliced pear with high-fiber grains and mixed raw nuts.",
      lunch: vegan
        ? "2-3 whole-wheat chapatis, protein-packed chana or tofu curry, seasonal vegetable stir-fry, and steamed brown rice."
        : "Complete vegetarian balanced lunch: 2-3 soft whole-wheat chapatis, protein-packed lentil dal, seasonal dry curry, and a small portion of steamed brown rice.",
      dinner: "1-2 chapatis or quinoa bowl with sautéed vegetables, paneer or tofu, and light dal.",
      glycemicIndex: "< 55 GI (Standard)",
      calorieEstimate: "1,800 - 2,100 kcal",
      notes: "Ensure adequate protein intake through lentils, legumes, paneer, tofu, and dairy. Include a variety of seasonal vegetables and fruits.",
      clinicalNote: "Your vegetarian plan is built around complete plant-based proteins, whole grains, and seasonal produce.",
      homeCareNote: "Stay hydrated with 2.5L water daily. For minor self-limiting illnesses (cold, mild throat irritation), prefer steam therapy, warm saline gargles, and rest before seeking clinical care.",
    }
  }

  if (nonVeg) {
    return {
      breakfast: "Eggs (boiled, poached, or scrambled) with whole-wheat toast and a side of fresh fruit. Avoid processed meats like bacon or sausage.",
      lunch: "2-3 whole-wheat chapatis with grilled chicken or fish curry, seasonal sabzi, and steamed brown rice. Include a fresh salad.",
      dinner: "Grilled fish or lean chicken breast with steamed vegetables and quinoa or 1 chapati. Light and early.",
      glycemicIndex: "< 55 GI (Standard)",
      calorieEstimate: "1,800 - 2,200 kcal",
      notes: "Prefer lean proteins (chicken breast, fish, eggs) over red meat. Include omega-3 rich fish (salmon, mackerel, sardines) twice weekly.",
      clinicalNote: "Your non-vegetarian plan focuses on lean proteins, whole grains, and seasonal vegetables.",
      homeCareNote: "Stay hydrated with 2.5L water daily. For minor self-limiting illnesses, prefer home-based supportive remedies before seeking clinical care.",
    }
  }

  return {
    breakfast: "Fresh whole apple or sliced pear with simple high-fiber grains and mixed raw nuts.",
    lunch: "Complete vegetarian balanced lunch: 2-3 soft whole-wheat chapatis, protein-packed lentil dal, seasonal dry curry, and a small portion of steamed brown rice.",
    dinner: "Light evening dinner: 1-2 soft chapatis with healthy seasonal dry vegetable curry, nutritious warm dal, and a light portion of steamed rice. Take at least 2 hours before resting.",
    glycemicIndex: "< 53 GI (Low)",
    calorieEstimate: "1,850 - 2,100 kcal",
    notes: "Your balanced profile supports a standard vegetarian meal pattern with whole grains, dal, and seasonal vegetables.",
    clinicalNote: "Standard profile plan. Always prioritize whole foods and seasonal produce.",
    homeCareNote: "Stay hydrated with 2.5L water daily. For minor health disturbances, prefer conservative home-based remedies before seeking clinical care.",
  }
}
