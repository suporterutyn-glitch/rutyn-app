import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const supabaseUrl = Deno.env.get("SUPABASE_URL")
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")

const supabase = createClient(supabaseUrl, supabaseKey)

serve(async () => {
  try {
    // Update exercise translations
    const exerciseUpdates = [
      { pt: "Agachamento", es: "Sentadilla" },
      { pt: "Rosca Direta", es: "Curl de bíceps" },
      { pt: "Supino Reto", es: "Press plano" },
    ]

    for (const { pt, es } of exerciseUpdates) {
      await supabase
        .from("exercises")
        .update({ name_es: es })
        .eq("name_pt", pt)
    }

    // Update food translations (if needed)
    const foodUpdates = [
      { pt: "Arroz Integral", es: "Arroz integral" },
      { pt: "Brócoli", es: "Brócoli" },
      { pt: "Pecho de Pollo", es: "Pechuga de pollo" },
    ]

    for (const { pt, es } of foodUpdates) {
      await supabase
        .from("foods")
        .update({ name_es: es })
        .eq("name_pt", pt)
    }

    return new Response(
      JSON.stringify({ success: true, message: "Bilingual data seeded" }),
      { headers: { "Content-Type": "application/json" } }
    )
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
})
