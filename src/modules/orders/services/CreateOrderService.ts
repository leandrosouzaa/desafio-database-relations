import { inject, injectable } from 'tsyringe';

import AppError from '@shared/errors/AppError';

import IProductsRepository from '@modules/products/repositories/IProductsRepository';
import ICustomersRepository from '@modules/customers/repositories/ICustomersRepository';
import Order from '../infra/typeorm/entities/Order';
import IOrdersRepository from '../repositories/IOrdersRepository';

interface IProduct {
  id: string;
  quantity: number;
}

interface IRequest {
  customer_id: string;
  products: IProduct[];
}

@injectable()
class CreateProductService {
  constructor(
    @inject('OrdersRepository')
    private ordersRepository: IOrdersRepository,
    @inject('ProductsRepository')
    private productsRepository: IProductsRepository,
    @inject('CustomersRepository')
    private customersRepository: ICustomersRepository,
  ) {}

  public async execute({ customer_id, products }: IRequest): Promise<Order> {
    const checkCustomerExist = await this.customersRepository.findById(
      customer_id,
    );

    if (!checkCustomerExist) {
      throw new AppError('Customer not exist');
    }

    const productsPrice = await this.productsRepository.findAllById(
      products.map(p => ({ id: p.id })),
    );

    if (products.length !== productsPrice.length) {
      throw new AppError('Product not exist');
    }

    products.forEach(p => {
      const productQuantityInDatabase = productsPrice.find(
        product => p.id === product.id,
      )?.quantity;

      if ((productQuantityInDatabase || 0) < p.quantity) {
        throw new AppError('Send a valid quantity');
      }
    });

    const order = await this.ordersRepository.create({
      customer: checkCustomerExist,
      products: products.map(product => ({
        product_id: product.id,
        price: productsPrice.find(({ id }) => id === product.id)?.price || 0,
        quantity: product.quantity,
      })),
    });

    await this.productsRepository.updateQuantity(products);

    return order;
  }
}

export default CreateProductService;
