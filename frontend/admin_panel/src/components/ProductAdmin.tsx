import React, { useEffect, useState } from "react";
import axios from "axios";
import { api } from "./api";
import {
    Box,
    Button,
    Card,
    CardActions,
    CardMedia,
    Chip,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControl,
    IconButton,
    InputLabel,
    MenuItem,
    Select,
    type SelectChangeEvent,
    TextField,
    Tooltip,
    Typography,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";
import nothingImg from "../assets/icons/nothing.svg";

type ProductType = "Букеты" | "Живые цветы";
type ProductSize = "S" | "M" | "L" | "";

interface Product {
    id: number;
    title: string;
    description: string;
    photos: string[];
    price_per_delivery: number;
    max_deliveries: number;
    max_months: number;
    type: ProductType;
    size?: ProductSize | null;
}

const defaultProduct: Omit<Product, "id"> = {
    title: "",
    description: "",
    photos: [],
    price_per_delivery: 0,
    max_deliveries: 1,
    max_months: 1,
    type: "Букеты",
    size: "",
};

const DESCRIPTION_MAX_LENGTH = 140;
const CARD_MIN_WIDTH = 340;
const CARD_MAX_WIDTH = 440;
const CARD_IMAGE_HEIGHT = 220;

const API_URL = import.meta.env.VITE_API_URL;
console.debug("API_URL", API_URL); // Должен быть https://fdd6f884afcb.ngrok-free.app

const ProductAdmin: React.FC = () => {
    const [products, setProducts] = useState<Product[]>([]);
    const [open, setOpen] = useState(false);
    const [editId, setEditId] = useState<number | null>(null);
    const [form, setForm] = useState<Omit<Product, "id">>(defaultProduct);
    const [photoUrl, setPhotoUrl] = useState("");
    const [formPhotoIdx, setFormPhotoIdx] = useState(0);
    const [cardPhotoIdx, setCardPhotoIdx] = useState<{ [id: number]: number }>({});
    const [deleteId, setDeleteId] = useState<number | null>(null);
    const [loading, setLoading] = useState(false);

    const fetchProducts = async () => {
        setLoading(true);
        try {
            const res = await api.get(`${API_URL}/products`);
            console.debug("API response for /products:", res.data);
            if (Array.isArray(res.data)) {
                setProducts(res.data);
            } else if (res.data && Array.isArray(res.data.data)) {
                setProducts(res.data.data);
            } else {
                console.error("products is not array!", res.data);
                setProducts([]);
            }
        } catch (e: any) {
            console.error("Ошибка при загрузке товаров:", e);
            setProducts([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProducts();
    }, []);

    const handleOpen = (product?: Product) => {
        setOpen(true);
        if (product) {
            setEditId(product.id);
            setForm({
                ...product,
                size: product.size ?? "",
            });
            setFormPhotoIdx(0);
            setPhotoUrl("");
        } else {
            setEditId(null);
            setForm(defaultProduct);
            setFormPhotoIdx(0);
            setPhotoUrl("");
        }
    };

    const handleClose = () => {
        setOpen(false);
        setForm(defaultProduct);
        setEditId(null);
        setFormPhotoIdx(0);
        setPhotoUrl("");
    };

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => {
        const { name, value } = e.target;
        setForm((prev) => ({
            ...prev,
            [name]: name.startsWith("max_") || name === "price_per_delivery"
                ? Number(value)
                : value,
        }));
        if (name === "photos") setFormPhotoIdx(0);
    };

    const handleSizeChange = (
        e: SelectChangeEvent<ProductSize>
    ) => {
        setForm((prev) => ({
            ...prev,
            size: e.target.value as ProductSize,
        }));
    };

    const handleAddPhoto = () => {
        if (photoUrl.trim() !== "") {
            setForm((prev) => ({
                ...prev,
                photos: [...prev.photos, photoUrl.trim()],
            }));
            setPhotoUrl("");
            setFormPhotoIdx(form.photos.length);
        }
    };
    const handleDeletePhoto = (idx: number) => {
        setForm((prev) => ({
            ...prev,
            photos: prev.photos.filter((_, i) => i !== idx),
        }));
        setFormPhotoIdx((prevIdx) =>
            idx === prevIdx ? 0 : prevIdx > idx ? prevIdx - 1 : prevIdx
        );
    };

    const handleSave = async () => {
        if (!form.title.trim() || !form.price_per_delivery || !form.max_deliveries || !form.max_months) return;
        try {
            if (editId !== null) {
                await axios.put(`${API_URL}/products/${editId}`, form);
            } else {
                await axios.post(`${API_URL}/products`, form);
            }
            fetchProducts();
            handleClose();
        } catch (e) {
            alert("Ошибка при сохранении товара");
        }
    };

    const confirmDelete = (id: number) => setDeleteId(id);
    const cancelDelete = () => setDeleteId(null);
    const handleDelete = async () => {
        try {
            if (deleteId) {
                await axios.delete(`${API_URL}/products/${deleteId}`);
                fetchProducts();
            }
        } catch {
            alert("Ошибка при удалении товара");
        }
        setDeleteId(null);
    };

    const trimDescription = (desc: string) => {
        if (desc.length > DESCRIPTION_MAX_LENGTH) {
            return desc.slice(0, DESCRIPTION_MAX_LENGTH) + "...";
        }
        return desc;
    };

    const handleCardPhotoChange = (id: number, dir: "next" | "prev", photosLen: number) => {
        setCardPhotoIdx((prev) => {
            const idx = prev[id] ?? 0;
            let newIdx = dir === "next" ? idx + 1 : idx - 1;
            if (newIdx < 0) newIdx = photosLen - 1;
            if (newIdx >= photosLen) newIdx = 0;
            return { ...prev, [id]: newIdx };
        });
    };
    const handleCardPhotoClick = (id: number, photosLen: number) =>
        handleCardPhotoChange(id, "next", photosLen);

    return (
        <Box sx={{ width: "100%", minHeight: "100%" }}>
            <Box
                sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "start",
                    mb: 3,
                    mt: 1,
                    gap: 2,
                }}
            >
                <Typography
                    variant="h4"
                    sx={{
                        color: "#5485E4",
                        fontFamily: "Nunito",
                        fontWeight: 700,
                        fontSize: 32,
                    }}
                >
                    Товары магазина
                </Typography>
                <Tooltip title="Добавить товар">
                    <IconButton
                        onClick={() => handleOpen()}
                        sx={{
                            background: "#E8F0FB",
                            color: "#5485E4",
                            width: 56,
                            height: 56,
                            borderRadius: "50%",
                            boxShadow: "0 4px 16px -6px #5485E440",
                            ":hover": {
                                background: "#5485E4",
                                color: "#fff",
                            },
                            fontSize: 32,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                        }}
                    >
                        <AddIcon sx={{ fontSize: 32 }}/>
                    </IconButton>
                </Tooltip>
            </Box>

            {loading ? (
                <Box sx={{ display: "flex", justifyContent: "center", my: 8 }}>
                    <CircularProgress/>
                </Box>
            ) : products.length === 0 ? (
                <Box
                    sx={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        minHeight: "60vh",
                    }}
                >
                    <img src={nothingImg} alt="Пусто" style={{ width: 180, marginBottom: 24 }}/>
                    <Typography
                        sx={{
                            color: "#848391",
                            fontFamily: "Nunito",
                            fontSize: 20,
                            mb: 2,
                            textAlign: "center",
                        }}
                    >
                        Каталог пуст, добавьте товары
                    </Typography>
                </Box>
            ) : (
                <Box
                    sx={{
                        width: "100%",
                        display: "grid",
                        gridTemplateColumns: {
                            xs: "1fr",
                            sm: `repeat(auto-fit, minmax(${CARD_MIN_WIDTH}px, 1fr))`,
                        },
                        gap: 3,
                        justifyContent: "center",
                        alignItems: "stretch",
                    }}
                >
                    {products.map((product) => (
                        <Card
                            key={product.id}
                            sx={{
                                width: "100%",
                                minWidth: CARD_MIN_WIDTH,
                                maxWidth: CARD_MAX_WIDTH,
                                margin: "0 auto",
                                borderRadius: 12,
                                boxShadow: "0 8px 32px -12px rgb(0 32 94 / 27%)",
                                fontFamily: "Nunito",
                                display: "flex",
                                flexDirection: "column",
                                background: "#fff",
                                overflow: "hidden",
                                alignItems: "stretch",
                            }}
                        >
                            <Box
                                sx={{
                                    width: "100%",
                                    height: CARD_IMAGE_HEIGHT,
                                    position: "relative",
                                    background: "#F5F6FB",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    cursor: product.photos.length > 1 ? "pointer" : "default",
                                }}
                                onClick={() =>
                                    product.photos.length > 1 &&
                                    handleCardPhotoClick(product.id, product.photos.length)
                                }
                            >
                                {product.photos.length > 0 ? (
                                    <>
                                        <CardMedia
                                            component="img"
                                            image={product.photos[cardPhotoIdx[product.id] ?? 0]}
                                            alt={product.title}
                                            sx={{
                                                width: "100%",
                                                height: "100%",
                                                objectFit: "cover",
                                                borderRadius: 0,
                                                minHeight: CARD_IMAGE_HEIGHT,
                                                transition: "box-shadow 0.2s",
                                            }}
                                        />
                                        {product.photos.length > 1 && (
                                            <>
                                                <IconButton
                                                    size="small"
                                                    sx={{
                                                        position: "absolute",
                                                        top: "50%",
                                                        left: 12,
                                                        transform: "translateY(-50%)",
                                                        background: "#fff",
                                                        color: "#5485E4",
                                                        boxShadow: 1,
                                                        ":hover": { background: "#F5F6FB" },
                                                    }}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleCardPhotoChange(
                                                            product.id,
                                                            "prev",
                                                            product.photos.length
                                                        );
                                                    }}
                                                >
                                                    <ArrowBackIosNewIcon fontSize="small"/>
                                                </IconButton>
                                                <IconButton
                                                    size="small"
                                                    sx={{
                                                        position: "absolute",
                                                        top: "50%",
                                                        right: 12,
                                                        transform: "translateY(-50%)",
                                                        background: "#fff",
                                                        color: "#5485E4",
                                                        boxShadow: 1,
                                                        ":hover": { background: "#F5F6FB" },
                                                    }}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleCardPhotoChange(
                                                            product.id,
                                                            "next",
                                                            product.photos.length
                                                        );
                                                    }}
                                                >
                                                    <ArrowForwardIosIcon fontSize="small"/>
                                                </IconButton>
                                            </>
                                        )}
                                    </>
                                ) : (
                                    <Box
                                        sx={{
                                            width: "100%",
                                            height: "100%",
                                            background: "#E8F0FB",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            color: "#848391",
                                            fontSize: 18,
                                        }}
                                    >
                                        Нет фото
                                    </Box>
                                )}
                            </Box>
                            <Box
                                sx={{
                                    flex: 1,
                                    display: "flex",
                                    flexDirection: "column",
                                    justifyContent: "space-between",
                                    p: 3,
                                    minHeight: 190,
                                }}
                            >
                                <Box>
                                    <Typography
                                        variant="h6"
                                        sx={{
                                            color: "#5485E4",
                                            fontFamily: "Nunito",
                                            mb: 1,
                                            fontWeight: 700,
                                            fontSize: 22,
                                            overflowWrap: "break-word",
                                        }}
                                    >
                                        {product.title}
                                    </Typography>
                                    <Typography
                                        variant="body2"
                                        sx={{
                                            color: "#848391",
                                            mb: 2,
                                            fontFamily: "Nunito",
                                            fontSize: 16,
                                            overflow: "hidden",
                                            textOverflow: "ellipsis",
                                            display: "-webkit-box",
                                            WebkitLineClamp: 3,
                                            WebkitBoxOrient: "vertical",
                                        }}
                                    >
                                        {trimDescription(product.description)}
                                    </Typography>
                                    <Box sx={{ mb: 1 }}>
                                        <Chip
                                            label={product.type}
                                            color={product.type === "Букеты" ? "primary" : "success"}
                                            sx={{
                                                bgcolor:
                                                    product.type === "Букеты" ? "#E8F0FB" : "#DFF5E5",
                                                color:
                                                    product.type === "Букеты" ? "#5485E4" : "#159C5B",
                                                fontWeight: "bold",
                                                mr: 1,
                                                fontSize: 15,
                                                borderRadius: 2,
                                            }}
                                        />
                                    </Box>
                                    <Box sx={{ color: "#262626", fontFamily: "Nunito", mb: 1 }}>
                                        <b>Стоимость за доставку:</b> {product.price_per_delivery} ₽
                                    </Box>
                                    <Box sx={{ color: "#262626", fontFamily: "Nunito", mb: 1 }}>
                                        <b>Макс. доставок в месяц:</b> {product.max_deliveries}
                                    </Box>
                                    <Box sx={{ color: "#262626", fontFamily: "Nunito", mb: 1 }}>
                                        <b>Макс. месяцев:</b> {product.max_months}
                                    </Box>
                                    {product.type === "Букеты" && product.size && (
                                        <Box sx={{ color: "#262626", fontFamily: "Nunito", mb: 1 }}>
                                            <b>Размер:</b> {product.size}
                                        </Box>
                                    )}
                                    <Box sx={{ mt: 2 }}>
                                        {product.photos.map((url, idx) => (
                                            <Chip
                                                key={idx}
                                                label={`Фото ${idx + 1}`}
                                                component="a"
                                                href={url}
                                                target="_blank"
                                                clickable
                                                sx={{
                                                    mr: 1,
                                                    mb: 1,
                                                    bgcolor: "#F5F6FB",
                                                    color: "#5485E4",
                                                    borderRadius: 2,
                                                }}
                                            />
                                        ))}
                                    </Box>
                                </Box>
                                <CardActions
                                    sx={{
                                        mt: 2,
                                        justifyContent: "flex-end",
                                        alignItems: "center",
                                        gap: 2,
                                    }}
                                >
                                    <IconButton
                                        sx={{ color: "#5485E4" }}
                                        onClick={() => handleOpen(product)}
                                    >
                                        <EditIcon/>
                                    </IconButton>
                                    <IconButton
                                        sx={{ color: "#D03A3A" }}
                                        onClick={() => confirmDelete(product.id)}
                                    >
                                        <DeleteIcon/>
                                    </IconButton>
                                </CardActions>
                            </Box>
                        </Card>
                    ))}
                </Box>
            )}

            <Dialog
                open={open}
                onClose={handleClose}
                maxWidth="sm"
                fullWidth
                PaperProps={{
                    sx: {
                        borderRadius: 12,
                        boxShadow: "0 12px 48px -16px rgb(84,133,228,0.15)",
                        p: 2,
                        background: "#fff",
                    },
                }}
            >
                <DialogTitle
                    sx={{
                        fontFamily: "Nunito",
                        color: "#5485E4",
                        fontWeight: 700,
                        fontSize: 26,
                        pb: 0,
                    }}
                >
                    {editId !== null ? "Редактировать товар" : "Добавить товар"}
                </DialogTitle>
                <DialogContent
                    sx={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 3,
                        pt: 2,
                    }}
                >
                    {form.photos.length > 0 && (
                        <Box
                            sx={{
                                position: "relative",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                mb: 2,
                                minHeight: 240,
                            }}
                        >
                            {form.photos.length > 1 && (
                                <IconButton
                                    size="large"
                                    sx={{
                                        position: "absolute",
                                        left: 12,
                                        top: "50%",
                                        transform: "translateY(-50%)",
                                        background: "#fff",
                                        color: "#5485E4",
                                        boxShadow: 1,
                                        zIndex: 2,
                                        ":hover": { background: "#F5F6FB" },
                                    }}
                                    onClick={() =>
                                        setFormPhotoIdx((idx) =>
                                            idx <= 0 ? form.photos.length - 1 : idx - 1
                                        )
                                    }
                                >
                                    <ArrowBackIosNewIcon fontSize="medium"/>
                                </IconButton>
                            )}
                            <Box sx={{ position: "relative" }}>
                                <CardMedia
                                    component="img"
                                    image={form.photos[formPhotoIdx]}
                                    alt={`Фото ${formPhotoIdx + 1}`}
                                    sx={{
                                        width: 380,
                                        height: 240,
                                        borderRadius: 10,
                                        objectFit: "cover",
                                        cursor: "pointer",
                                        boxShadow: "0 4px 24px -8px #5485E440",
                                        mx: 2,
                                    }}
                                    onClick={() =>
                                        setFormPhotoIdx((idx) =>
                                            idx >= form.photos.length - 1 ? 0 : idx + 1
                                        )
                                    }
                                />
                                <IconButton
                                    size="large"
                                    onClick={() => handleDeletePhoto(formPhotoIdx)}
                                    sx={{
                                        position: "absolute",
                                        right: 12,
                                        bottom: 12,
                                        background: "#fff",
                                        color: "#D03A3A",
                                        boxShadow: 1,
                                        zIndex: 2,
                                        ":hover": { background: "#F5F6FB" },
                                    }}
                                >
                                    <DeleteIcon fontSize="medium"/>
                                </IconButton>
                            </Box>
                            {form.photos.length > 1 && (
                                <IconButton
                                    size="large"
                                    sx={{
                                        position: "absolute",
                                        right: 12,
                                        top: "50%",
                                        transform: "translateY(-50%)",
                                        background: "#fff",
                                        color: "#5485E4",
                                        boxShadow: 1,
                                        zIndex: 2,
                                        ":hover": { background: "#F5F6FB" },
                                    }}
                                    onClick={() =>
                                        setFormPhotoIdx((idx) =>
                                            idx >= form.photos.length - 1 ? 0 : idx + 1
                                        )
                                    }
                                >
                                    <ArrowForwardIosIcon fontSize="medium"/>
                                </IconButton>
                            )}
                        </Box>
                    )}

                    <TextField
                        label="Заголовок"
                        name="title"
                        value={form.title}
                        onChange={handleChange}
                        fullWidth
                        variant="outlined"
                        sx={{ fontFamily: "Nunito", borderRadius: 3 }}
                        inputProps={{ maxLength: 48 }}
                    />
                    <TextField
                        label="Описание"
                        name="description"
                        value={form.description}
                        onChange={handleChange}
                        fullWidth
                        multiline
                        minRows={2}
                        variant="outlined"
                        sx={{ fontFamily: "Nunito", borderRadius: 3 }}
                        inputProps={{ maxLength: 200 }}
                    />
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <TextField
                            label="Ссылка на фото"
                            value={photoUrl}
                            onChange={(e) => setPhotoUrl(e.target.value)}
                            fullWidth
                            variant="outlined"
                            sx={{ fontFamily: "Nunito", borderRadius: 3 }}
                        />
                        <Button
                            variant="outlined"
                            sx={{
                                borderColor: "#5485E4",
                                color: "#5485E4",
                                fontFamily: "Nunito",
                                borderRadius: 3,
                                height: 56,
                            }}
                            onClick={handleAddPhoto}
                            disabled={!photoUrl.trim()}
                        >
                            Добавить
                        </Button>
                    </Box>
                    <TextField
                        label="Максимум доставок в месяц"
                        name="max_deliveries"
                        type="number"
                        value={form.max_deliveries}
                        onChange={handleChange}
                        fullWidth
                        variant="outlined"
                        sx={{ fontFamily: "Nunito", borderRadius: 3 }}
                        inputProps={{ min: 1 }}
                        error={
                            !!form.max_deliveries &&
                            (Number(form.max_deliveries) < 1 ||
                                isNaN(Number(form.max_deliveries)))
                        }
                        helperText="Введите максимальное количество доставок (минимум 1)"
                    />
                    <TextField
                        label="Максимум месяцев"
                        name="max_months"
                        type="number"
                        value={form.max_months}
                        onChange={handleChange}
                        fullWidth
                        variant="outlined"
                        sx={{ fontFamily: "Nunito", borderRadius: 3 }}
                        inputProps={{ min: 1 }}
                        error={
                            !!form.max_months &&
                            (Number(form.max_months) < 1 ||
                                isNaN(Number(form.max_months)))
                        }
                        helperText="Введите максимальное количество месяцев (минимум 1)"
                    />
                    <TextField
                        label="Стоимость за одну доставку"
                        name="price_per_delivery"
                        type="number"
                        value={form.price_per_delivery}
                        onChange={handleChange}
                        fullWidth
                        variant="outlined"
                        sx={{ fontFamily: "Nunito", borderRadius: 3 }}
                        inputProps={{ min: 0 }}
                    />
                    <TextField
                        select
                        label="Тип"
                        name="type"
                        value={form.type}
                        onChange={handleChange}
                        fullWidth
                        variant="outlined"
                        sx={{ fontFamily: "Nunito", borderRadius: 3 }}
                    >
                        <MenuItem value="Букеты">Букеты</MenuItem>
                        <MenuItem value="Живые цветы">Живые цветы</MenuItem>
                    </TextField>
                    {form.type === "Букеты" && (
                        <FormControl fullWidth variant="outlined" sx={{ fontFamily: "Nunito", borderRadius: 3 }}>
                            <InputLabel id="size-label">Размер букета</InputLabel>
                            <Select
                                labelId="size-label"
                                label="Размер букета"
                                name="size"
                                value={form.size ?? ""}
                                onChange={handleSizeChange}
                            >
                                <MenuItem value="S">Размер S</MenuItem>
                                <MenuItem value="M">Размер M</MenuItem>
                                <MenuItem value="L">Размер L</MenuItem>
                            </Select>
                        </FormControl>
                    )}
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button
                        onClick={handleClose}
                        variant="outlined"
                        sx={{
                            borderColor: "#848391",
                            color: "#848391",
                            fontFamily: "Nunito",
                            borderRadius: 3,
                            height: 48,
                        }}
                    >
                        Отмена
                    </Button>
                    <Button
                        onClick={handleSave}
                        variant="contained"
                        sx={{
                            background: "#5485E4",
                            color: "#fff",
                            borderRadius: 3,
                            fontFamily: "Nunito",
                            height: 48,
                        }}
                        disabled={
                            !form.title.trim() ||
                            !form.max_deliveries ||
                            !form.max_months ||
                            isNaN(Number(form.max_deliveries)) ||
                            isNaN(Number(form.max_months)) ||
                            Number(form.max_deliveries) < 1 ||
                            Number(form.max_months) < 1
                        }
                    >
                        Сохранить
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog
                open={deleteId !== null}
                onClose={cancelDelete}
                PaperProps={{
                    sx: { borderRadius: 6, p: 2 },
                }}
            >
                <DialogTitle
                    sx={{
                        fontFamily: "Nunito",
                        color: "#D03A3A",
                        fontWeight: 700,
                        fontSize: 22,
                    }}
                >
                    Удалить товар?
                </DialogTitle>
                <DialogContent>
                    <Typography sx={{ fontFamily: "Nunito", color: "#848391" }}>
                        Вы уверены, что хотите удалить этот товар? Это действие нельзя отменить.
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button
                        onClick={cancelDelete}
                        variant="outlined"
                        sx={{
                            borderColor: "#848391",
                            color: "#848391",
                            fontFamily: "Nunito",
                            borderRadius: 3,
                            height: 48,
                        }}
                    >
                        Отмена
                    </Button>
                    <Button
                        onClick={handleDelete}
                        variant="contained"
                        sx={{
                            background: "#D03A3A",
                            color: "#fff",
                            borderRadius: 3,
                            fontFamily: "Nunito",
                            height: 48,
                        }}
                    >
                        Удалить
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default ProductAdmin;