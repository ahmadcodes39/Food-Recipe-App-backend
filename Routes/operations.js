import express from "express";
import { Recipe } from "../Models/recipe.js";
import multer from "multer";
import fs from "fs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

const uploadMiddleware = multer({ dest: "uploads/" });

const recipeRouter = express.Router();

recipeRouter.post( "/addRecipe", uploadMiddleware.single("file"), async (req, res) => {
    try {
      const { originalname, path } = req.file;
      const parts = originalname.split(".");
      const extension = parts[parts.length - 1];
      const newPath = path + "." + extension;
      fs.renameSync(path, newPath);

      const token = req.cookies.recpieToken;
      if (!token) {
        return res.status(400).json({ message: "Token is expired" });
      }
      jwt.verify(token, process.env.SECRET, async (err, info) => {
        if (err) {
          return res.status(404).json({ message: "token not verifyed" });
        }
        const { name, description, ingredients, category } = req.body;
        const newRecipe = await Recipe.create({
          name,
          description,
          ingredients,
          category,
          coverImg: newPath,
          author: info.id,
        });
        if (newRecipe) {
          return res
            .status(200)
            .json({ message: "New Recipe added", Recipe: newRecipe });
        } else {
          return res
            .status(500)
            .json({ message: "New Recipe not added", Recipe: newRecipe });
        }
      });
    } catch (error) {
      return res
        .status(500)
        .json({ message: "internal server error", Error: error });
    }
  }
);

recipeRouter.get("/getRecipes", async (req, res) => {
  try {
    const recipe = await Recipe.find().sort({createdAt:-1});
    if (recipe) {
      return res.status(200).json(recipe);
    } else {
      return res
        .status(500)
        .json({ message: "server error data not fetched", data: recipe });
    }
  } catch (error) {
    return res
      .status(500)
      .json({ message: "internal server error data ", data: error });
  }
});

recipeRouter.get("/getRecipes/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const data = await Recipe.findById(id).populate("author", ["name"]).sort({createdAt:-1});
    if (data) {
      return res.status(200).json({ message: "ok", data });
    } else {
      return res.status(404).json({ message: "such recipe not found", data });
    }
  } catch (error) {
    return res.status(500).json({ message: "internal server error", data });
  }
});

recipeRouter.put(
  "/editRecipe/:id",
  uploadMiddleware.single("file"),
  async (req, res) => {
    let newPath = null;
    const { id } = req.params;

    try {
      if (req.file) {
        const { originalname, path } = req.file;
        const parts = originalname.split(".");
        const extension = parts[parts.length - 1];
        newPath = path + "." + extension;
        fs.renameSync(path, newPath);
      }

      const token = req.cookies.recpieToken;
      if (!token) {
        return res.status(400).json({ message: "Token is expired" });
      }

      jwt.verify(token, process.env.SECRET, async (err, info) => {
        if (err) {
          return res.status(404).json({ message: "Token not verified" });
        }

        const recipe = await Recipe.findById(id);
        if (!recipe) {
          return res.status(404).json({ message: "Recipe not found" });
        }

        const { name, description, ingredients, category } = req.body;
        const isAuthor = recipe.author.toString() === info.id;
        if (!isAuthor) {
          return res
            .status(400)
            .json({ message: "You are not the author of this post" });
        }

        const updatedRecipe = await Recipe.findByIdAndUpdate(id, {
          name,
          description,
          ingredients,
          category,
          coverImg: newPath ? newPath : recipe.coverImg,
          author: info.id,
        });

        if (updatedRecipe) {
          return res.status(200).json(updatedRecipe);
        } else {
          return res.status(500).json({ message: "Recipe not updated" });
        }
      });
    } catch (error) {
      return res
        .status(500)
        .json({ message: "Internal server error", Error: error });
    }
  }
);

recipeRouter.get("/myRecipes", async (req, res) => {
  const token = req.cookies.recpieToken;

  try {
    if (!token) {
      return res.status(401).json({ message: "Your session has expired. Please log in first." });
    }

    jwt.verify(token, process.env.SECRET, async (err, info) => {
      if (err) {
        return res.status(401).json({ message: "JWT token is invalid." });
      }

      // Fetch all recipes where the author matches the logged-in user's ID
      const recipes = await Recipe.find({ author: info.id }).populate('author',['name']).sort({createdAt:-1});
      if (!recipes || recipes.length === 0) {
        return res.status(404).json({ message: "No recipes found for this user." });
      }

      return res.status(200).json(recipes);
    });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error", Error: error });
  }
});

recipeRouter.delete('/recipe/:id',async(req,res)=>{
  try {
    const {id} = req.params 
    const deleteRecipe = await Recipe.findByIdAndDelete(id)
    if (deleteRecipe) { 
      return res.status(200).json(deleteRecipe)
    }
    else{
      return res.status(500).json({message:'internal server error recipe not deleted'})
    }
  } catch (error) {
    return res.status(500).json({message:'internal server error catch error recipe not deleted'})
  }
})  

recipeRouter.get('/respectiveCategory/:item',async(req,res)=>{
  const {item} = req.params
  console.log(item)
  try {
     const data = await Recipe.find({category:item}).sort({createdAt:-1})
     if (data) {
      return res.status(200).json(data)
     }
  } catch (error) {
    return res.status(500).json({message:'Internal server error'})
  }
})

export default recipeRouter;
