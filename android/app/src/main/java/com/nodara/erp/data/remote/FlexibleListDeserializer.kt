package com.nodara.erp.data.remote

import com.google.gson.*
import java.lang.reflect.ParameterizedType
import java.lang.reflect.Type

class FlexibleListDeserializer : JsonDeserializer<List<*>> {
    override fun deserialize(
        json: JsonElement?,
        typeOfT: Type?,
        context: JsonDeserializationContext?
    ): List<*> {
        if (json == null || json.isJsonNull) {
            return emptyList<Any>()
        }

        val itemType = if (typeOfT is ParameterizedType) {
            typeOfT.actualTypeArguments.firstOrNull() ?: Any::class.java
        } else {
            Any::class.java
        }

        val arrayToParse: JsonArray = when {
            json.isJsonArray -> json.asJsonArray
            json.isJsonObject -> {
                val obj = json.asJsonObject
                when {
                    obj.has("items") && obj.get("items").isJsonArray -> obj.getAsJsonArray("items")
                    obj.has("data") && obj.get("data").isJsonArray -> obj.getAsJsonArray("data")
                    else -> JsonArray()
                }
            }
            else -> JsonArray()
        }

        val result = mutableListOf<Any?>()
        for (element in arrayToParse) {
            val item = context?.deserialize<Any>(element, itemType)
            result.add(item)
        }
        return result
    }
}
